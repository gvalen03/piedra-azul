const fallo = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const perfiles = new Set(["profesionales", "pacientes"]);
const usuarioPublico = `u.id, u.username, pe.nombre, pe.apellido, pe.email, u.rol, u.activo,
  pr.id AS profesional_id, pa.id AS paciente_id`;
const perfilSelect = tipo => tipo === "profesionales"
  ? `SELECT pr.id, pr.persona_id, pe.nombre, pe.apellido, pe.numero_documento, pe.email, pe.telefono, pr.activo
     FROM profesionales pr JOIN personas pe ON pe.id=pr.persona_id`
  : `SELECT pa.id, pa.persona_id, pe.nombre, pe.apellido, pe.numero_documento, pe.fecha_nacimiento::text AS fecha_nacimiento,
       pe.email, pe.telefono, pe.direccion, pe.genero, pa.eps, pa.estado
     FROM pacientes pa JOIN personas pe ON pe.id=pa.persona_id`;

export class AdminRepository {
  constructor(db) { this.db = db; }
  async listarCuentasAcceso() {
    const result = await this.db.query(`SELECT u.id, u.username, u.activo, u.keycloak_subject,
      pe.nombre, pe.apellido, pe.numero_documento, pe.email,
      pr.id AS profesional_id, pa.id AS paciente_id, provision.rol
      FROM usuarios u JOIN personas pe ON pe.id=u.persona_id
      LEFT JOIN profesionales pr ON pr.persona_id=u.persona_id
      LEFT JOIN pacientes pa ON pa.persona_id=u.persona_id
      LEFT JOIN LATERAL (SELECT rol FROM aprovisionamientos_usuarios ap
        WHERE ap.username=u.username AND ap.estado='COMPLETADO' ORDER BY ap.id DESC LIMIT 1) provision ON TRUE
      ORDER BY pe.nombre, pe.apellido, u.id`);
    return result.rows;
  }
  async listar(tipo) {
    if (tipo === "usuarios") return (await this.db.query(`SELECT ${usuarioPublico} FROM usuarios u JOIN personas pe ON pe.id=u.persona_id
      LEFT JOIN profesionales pr ON pr.persona_id=u.persona_id LEFT JOIN pacientes pa ON pa.persona_id=u.persona_id ORDER BY pe.nombre, u.id`)).rows;
    if (!perfiles.has(tipo)) throw fallo("Recurso inválido");
    return (await this.db.query(`${perfilSelect(tipo)} ORDER BY pe.nombre, pe.apellido, id`)).rows;
  }
  async transaccion(accion) {
    const client = await this.db.connect();
    try { await client.query("BEGIN"); const result = await accion(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK");
      if (error.code === "23505") throw fallo("Ya existe un registro con ese usuario, correo o documento", 409);
      if (error.code === "23503") throw fallo("El perfil seleccionado ya no existe", 409); throw error;
    } finally { client.release(); }
  }
  async auditar(client, tipo, id, actor, accion) {
    await client.query(`INSERT INTO auditorias (tipo_evento, descripcion, entidad_id, realizado_por, modulo_origen)
      VALUES ($1,$2,$3,$4,'ADMINISTRACION')`, [`${tipo.toUpperCase()}_${accion}`, `${accion === "CREADO" ? "Creación" : "Actualización"} de ${tipo}`, String(id), actor]);
  }
  async verificarActor(client, actor) {
    // La autorización de administrador ya se validó con el token de Keycloak
    // en la ruta. Aquí solo confirmamos que el vínculo local siga activo.
    const result = await client.query("SELECT id FROM usuarios WHERE username=$1 AND activo=TRUE", [actor]);
    if (!result.rows.length) throw fallo("Tu cuenta ya no tiene permisos de administración", 403);
  }
  async guardarUsuario(id, datos, actor) {
    return this.transaccion(async client => {
      await client.query("LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE"); await this.verificarActor(client, actor);
      const esPerfil = ["MEDICO_TERAPISTA", "PACIENTE"].includes(datos.rol);
      const tabla = datos.rol === "MEDICO_TERAPISTA" ? "profesionales" : "pacientes";
      const perfilId = datos.rol === "MEDICO_TERAPISTA" ? datos.profesionalId : datos.pacienteId;
      let personaId;
      if (esPerfil) {
        if (!perfilId) throw fallo("Selecciona el perfil correspondiente al rol");
        const perfil = await client.query(`SELECT persona_id, ${datos.rol === "MEDICO_TERAPISTA" ? "activo" : "estado"} FROM ${tabla} WHERE id=$1 FOR UPDATE`, [perfilId]);
        if (!perfil.rows.length) throw fallo("El perfil seleccionado no existe");
        if (datos.activo && (datos.rol === "MEDICO_TERAPISTA" ? !perfil.rows[0].activo : perfil.rows[0].estado !== "ACTIVO")) throw fallo("Activa primero el perfil seleccionado");
        personaId = perfil.rows[0].persona_id;
      }
      let previo = null;
      if (id) {
        previo = (await client.query("SELECT id, username, rol, activo, persona_id FROM usuarios WHERE id=$1 FOR UPDATE", [id])).rows[0];
        if (!previo) throw fallo("Usuario no encontrado", 404);
        if (previo.username === actor) throw fallo("No puedes modificar tu propia cuenta desde administración");
        if (previo.rol === "ADMINISTRADOR" && previo.activo && (!datos.activo || datos.rol !== "ADMINISTRADOR")) {
          const otros = await client.query("SELECT id FROM usuarios WHERE rol='ADMINISTRADOR' AND activo=TRUE AND id<>$1", [id]);
          if (!otros.rows.length) throw fallo("Debe permanecer al menos un administrador activo", 409);
        }
      }
      if (!personaId) personaId = previo?.persona_id;
      if (!personaId) {
        const partes = datos.nombre.trim().split(/\s+/); const nombre = partes.shift(); const apellido = partes.join(" ") || "Sin apellido";
        const persona = await client.query(`INSERT INTO personas (nombre, apellido, numero_documento, email)
          VALUES ($1,$2,$3,$4) RETURNING id`, [nombre, apellido, `CUENTA-${datos.username}`, datos.email]);
        personaId = persona.rows[0].id;
      }
      const vinculada = await client.query("SELECT id FROM usuarios WHERE persona_id=$1 AND ($2::bigint IS NULL OR id<>$2)", [personaId, id || null]);
      if (vinculada.rows.length) throw fallo("Este perfil ya está vinculado a otra cuenta", 409);
      let result;
      if (id) {
        await client.query("UPDATE personas SET email=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2", [datos.email, personaId]);
        result = await client.query(`UPDATE usuarios SET username=$1, rol=$2, activo=$3, persona_id=$4,
          password=COALESCE($5,password), updated_at=GREATEST(CURRENT_TIMESTAMP, updated_at + INTERVAL '1 millisecond')
          WHERE id=$6 RETURNING id`, [datos.username, datos.rol, datos.activo, personaId, datos.passwordHash || null, id]);
      } else {
        result = await client.query("INSERT INTO usuarios (persona_id, username, rol, activo, password) VALUES ($1,$2,$3,$4,$5) RETURNING id", [personaId, datos.username, datos.rol, datos.activo, datos.passwordHash || null]);
      }
      const usuario = (await client.query(`SELECT ${usuarioPublico} FROM usuarios u JOIN personas pe ON pe.id=u.persona_id
        LEFT JOIN profesionales pr ON pr.persona_id=u.persona_id LEFT JOIN pacientes pa ON pa.persona_id=u.persona_id WHERE u.id=$1`, [result.rows[0].id])).rows[0];
      await this.auditar(client, "usuarios", usuario.id, actor, id ? "ACTUALIZADO" : "CREADO"); return usuario;
    });
  }
  async guardarPerfil(tipo, id, datos, actor) {
    if (!perfiles.has(tipo)) throw fallo("Recurso inválido");
    return this.transaccion(async client => {
      await this.verificarActor(client, actor); const editando = Boolean(id); let personaId;
      if (id) {
        const tabla = tipo === "profesionales" ? "profesionales" : "pacientes";
        const perfil = await client.query(`SELECT persona_id FROM ${tabla} WHERE id=$1 FOR UPDATE`, [id]);
        if (!perfil.rows.length) throw fallo("Registro no encontrado", 404); personaId = perfil.rows[0].persona_id;
        await client.query(`UPDATE personas SET nombre=$1, apellido=$2, numero_documento=$3, email=$4, telefono=$5,
          fecha_nacimiento=$6, direccion=$7, genero=$8, updated_at=CURRENT_TIMESTAMP WHERE id=$9`,
          [datos.nombre, datos.apellido, datos.numeroDocumento, datos.email, datos.telefono, tipo === "pacientes" ? datos.fechaNacimiento : null,
            tipo === "pacientes" ? datos.direccion : null, tipo === "pacientes" ? datos.genero : null, personaId]);
        await client.query(tipo === "profesionales" ? "UPDATE profesionales SET activo=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2" : "UPDATE pacientes SET eps=$1, estado=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3",
          tipo === "profesionales" ? [datos.activo, id] : [datos.eps, datos.estado, id]);
      } else {
        const persona = await client.query(`INSERT INTO personas (nombre, apellido, numero_documento, email, telefono, fecha_nacimiento, direccion, genero)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [datos.nombre, datos.apellido, datos.numeroDocumento, datos.email, datos.telefono,
          tipo === "pacientes" ? datos.fechaNacimiento : null, tipo === "pacientes" ? datos.direccion : null, tipo === "pacientes" ? datos.genero : null]);
        personaId = persona.rows[0].id;
        const inserted = await client.query(tipo === "profesionales" ? "INSERT INTO profesionales (persona_id,tipo_profesional,activo) VALUES ($1,'MEDICO',$2) RETURNING id" : "INSERT INTO pacientes (persona_id,eps,estado) VALUES ($1,$2,$3) RETURNING id",
          tipo === "profesionales" ? [personaId, datos.activo] : [personaId, datos.eps, datos.estado]); id = inserted.rows[0].id;
      }
      const perfil = (await client.query(`${perfilSelect(tipo)} WHERE ${tipo === "profesionales" ? "pr.id" : "pa.id"}=$1`, [id])).rows[0];
      await this.auditar(client, tipo, id, actor, editando ? "ACTUALIZADO" : "CREADO"); return perfil;
    });
  }
  async eliminarPerfil(tipo, id, actor) {
    if (!perfiles.has(tipo)) throw fallo("Recurso inválido");
    return this.transaccion(async client => {
      await this.verificarActor(client, actor); const tabla = tipo === "profesionales" ? "profesionales" : "pacientes";
      const perfil = await client.query(`SELECT persona_id FROM ${tabla} WHERE id=$1 FOR UPDATE`, [id]); if (!perfil.rows.length) throw fallo("Registro no encontrado", 404);
      const dependencias = tipo === "profesionales"
        ? await client.query(`SELECT EXISTS(SELECT 1 FROM citas WHERE profesional_id=$1) AS citas, EXISTS(SELECT 1 FROM controles_clinicos WHERE profesional_id=$1) AS controles,
          EXISTS(SELECT 1 FROM disponibilidades WHERE profesional_id=$1) AS disponibilidad, EXISTS(SELECT 1 FROM usuarios WHERE persona_id=$2) AS cuenta`, [id, perfil.rows[0].persona_id])
        : await client.query(`SELECT EXISTS(SELECT 1 FROM citas WHERE paciente_id=$1) AS citas, EXISTS(SELECT 1 FROM historias_clinicas WHERE paciente_id=$1) AS historia,
          EXISTS(SELECT 1 FROM controles_clinicos WHERE paciente_id=$1) AS controles, EXISTS(SELECT 1 FROM usuarios WHERE persona_id=$2) AS cuenta`, [id, perfil.rows[0].persona_id]);
      const encontrados = Object.entries(dependencias.rows[0]).filter(([, value]) => value).map(([key]) => key);
      if (encontrados.length) throw fallo(`No se puede eliminar el perfil porque tiene: ${encontrados.join(", ")}. Desactívalo en lugar de eliminarlo.`, 409);
      await this.auditar(client, tipo, id, actor, "ELIMINADO"); await client.query(`DELETE FROM ${tabla} WHERE id=$1`, [id]);
      await client.query("DELETE FROM personas WHERE id=$1", [perfil.rows[0].persona_id]); return { id, tipo, eliminado: true };
    });
  }
}
