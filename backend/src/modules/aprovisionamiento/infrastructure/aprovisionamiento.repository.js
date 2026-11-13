const fallo = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const roles = new Set(["PACIENTE", "MEDICO_TERAPISTA", "AGENDADOR", "ADMINISTRADOR"]);

export class AprovisionamientoRepository {
  constructor(db) { this.db = db; }

  async transaccion(accion) {
    const client = await this.db.connect();
    try { await client.query("BEGIN"); const result = await accion(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); if (error.code === "23505") throw fallo("Ya existe un registro con ese usuario, documento, correo o cuenta de Keycloak", 409); throw error; }
    finally { client.release(); }
  }

  async reservar(datos, actor) {
    return this.transaccion(async client => {
      await client.query("LOCK TABLE aprovisionamientos_usuarios IN SHARE ROW EXCLUSIVE MODE");
      const anterior = await client.query("SELECT id, estado FROM aprovisionamientos_usuarios WHERE username=$1 FOR UPDATE", [datos.username]);
      if (anterior.rows.length) throw fallo(anterior.rows[0].estado === "COMPLETADO" ? "Este usuario ya fue aprovisionado" : "Ya existe un aprovisionamiento pendiente para este usuario", 409);
      const existente = await client.query("SELECT id, keycloak_subject FROM usuarios WHERE username=$1 FOR UPDATE", [datos.username]);
      if (existente.rows[0]?.keycloak_subject) throw fallo("El usuario local ya está vinculado a Keycloak", 409);
      if (!existente.rows.length) {
        const perfilId = datos.rol === "PACIENTE" ? datos.pacienteId : datos.rol === "MEDICO_TERAPISTA" ? datos.profesionalId : null;
        if (perfilId) {
          const tabla = datos.rol === "PACIENTE" ? "pacientes" : "profesionales";
          const perfil = await client.query(`SELECT persona_id FROM ${tabla} WHERE id=$1 FOR UPDATE`, [perfilId]);
          if (!perfil.rows.length) throw fallo("El perfil indicado no existe", 404);
          const cuentaPerfil = await client.query("SELECT id FROM usuarios WHERE persona_id=$1 FOR UPDATE", [perfil.rows[0].persona_id]);
          if (cuentaPerfil.rows.length) throw fallo("El perfil indicado ya está vinculado a otra cuenta", 409);
        } else {
          const duplicado = await client.query("SELECT id FROM personas WHERE numero_documento=$1 OR LOWER(email)=LOWER($2) FOR UPDATE", [datos.numeroDocumento, datos.email]);
          if (duplicado.rows.length) throw fallo("Ya existe una persona con ese documento o correo; indica su perfil para vincularla", 409);
        }
      }
      const result = await client.query(`INSERT INTO aprovisionamientos_usuarios (username, rol, estado, solicitado_por)
        VALUES ($1,$2,'PENDIENTE',$3) RETURNING id`, [datos.username, datos.rol, actor]);
      return { id: result.rows[0].id };
    });
  }

  async registrarCuentaKeycloak(id, subject) {
    await this.db.query(`UPDATE aprovisionamientos_usuarios SET keycloak_subject=$2, estado='KEYCLOAK_CREADO', updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [id, subject]);
  }

  async finalizar(id, datos, subject) {
    return this.transaccion(async client => {
      const operacion = await client.query("SELECT * FROM aprovisionamientos_usuarios WHERE id=$1 FOR UPDATE", [id]);
      if (!operacion.rows.length || operacion.rows[0].estado === "COMPLETADO") throw fallo("La operación de aprovisionamiento no está disponible", 409);
      if (!roles.has(datos.rol)) throw fallo("Rol no autorizado", 400);
      let usuario = (await client.query("SELECT id, persona_id, keycloak_subject FROM usuarios WHERE username=$1 FOR UPDATE", [datos.username])).rows[0];
      let personaId = usuario?.persona_id;
      if (usuario?.keycloak_subject && usuario.keycloak_subject !== subject) throw fallo("El usuario local ya está vinculado a otra cuenta de Keycloak", 409);
      if (!personaId) personaId = await this.resolverPersona(client, datos);
      if (usuario) {
        await client.query("UPDATE usuarios SET keycloak_subject=$1, activo=TRUE, updated_at=CURRENT_TIMESTAMP WHERE id=$2", [subject, usuario.id]);
      } else {
        const insert = await client.query("INSERT INTO usuarios (persona_id, username, keycloak_subject, activo) VALUES ($1,$2,$3,TRUE) RETURNING id", [personaId, datos.username, subject]);
        usuario = { id: insert.rows[0].id, persona_id: personaId };
      }
      await client.query(`UPDATE aprovisionamientos_usuarios SET keycloak_subject=$2, estado='COMPLETADO', updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [id, subject]);
      return { id: Number(usuario.id), username: datos.username, rol: datos.rol, keycloakSubject: subject, activo: true };
    });
  }

  async resolverPersona(client, datos) {
    const perfilId = datos.rol === "PACIENTE" ? datos.pacienteId : datos.rol === "MEDICO_TERAPISTA" ? datos.profesionalId : null;
    const tabla = datos.rol === "PACIENTE" ? "pacientes" : "profesionales";
    if (perfilId) {
      const perfil = await client.query(`SELECT p.persona_id, ${datos.rol === "PACIENTE" ? "p.estado" : "p.activo"} AS estado
        FROM ${tabla} p WHERE p.id=$1 FOR UPDATE`, [perfilId]);
      if (!perfil.rows.length) throw fallo("El perfil indicado no existe", 404);
      if (perfil.rows[0].estado !== "ACTIVO" && perfil.rows[0].estado !== true) throw fallo("El perfil indicado debe estar activo", 409);
      return perfil.rows[0].persona_id;
    }
    const duplicado = await client.query("SELECT id FROM personas WHERE numero_documento=$1 OR ($2::text IS NOT NULL AND LOWER(email)=LOWER($2)) FOR UPDATE", [datos.numeroDocumento, datos.email || null]);
    if (duplicado.rows.length) throw fallo("Ya existe una persona con ese documento o correo; indica su perfil para vincularla", 409);
    const persona = await client.query(`INSERT INTO personas (nombre, apellido, numero_documento, email, telefono, fecha_nacimiento, direccion, genero)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [datos.nombre, datos.apellido, datos.numeroDocumento, datos.email || null, datos.telefono || null,
      datos.rol === "PACIENTE" ? datos.fechaNacimiento : null, datos.rol === "PACIENTE" ? datos.direccion || null : null, datos.rol === "PACIENTE" ? datos.genero : null]);
    const personaId = persona.rows[0].id;
    if (datos.rol === "PACIENTE") await client.query("INSERT INTO pacientes (persona_id, eps, estado) VALUES ($1,$2,'ACTIVO')", [personaId, datos.eps || null]);
    if (datos.rol === "MEDICO_TERAPISTA") await client.query("INSERT INTO profesionales (persona_id, tipo_profesional, activo) VALUES ($1,$2,TRUE)", [personaId, datos.tipoProfesional || "MEDICO"]);
    return personaId;
  }

  async compensar(id, estado, detalle) {
    await this.db.query("UPDATE aprovisionamientos_usuarios SET estado=$2, detalle_error=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$1", [id, estado, detalle.slice(0, 500)]);
  }
}
