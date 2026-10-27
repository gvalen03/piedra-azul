const fallo = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const usuarioPublico = "id, username, nombre, email, rol, activo, medico_id, paciente_id";
const perfiles = {
  medicos: { columns: ["nombre", "apellido", "numero_documento", "email", "telefono", "activo"], keys: ["nombre", "apellido", "numeroDocumento", "email", "telefono", "activo"] },
  pacientes: { columns: ["nombre", "apellido", "numero_documento", "fecha_nacimiento", "email", "telefono", "direccion", "eps", "genero", "estado"], keys: ["nombre", "apellido", "numeroDocumento", "fechaNacimiento", "email", "telefono", "direccion", "eps", "genero", "estado"] }
};
export class AdminRepository {
  constructor(db) { this.db = db; }
  async listar(tipo) {
    if (tipo === "usuarios") return (await this.db.query(`SELECT ${usuarioPublico} FROM usuarios ORDER BY nombre, id`)).rows;
    if (!perfiles[tipo]) throw fallo("Recurso inválido");
    const fecha = tipo === "pacientes" ? ", fecha_nacimiento::text AS fecha_nacimiento" : "";
    return (await this.db.query(`SELECT *${fecha} FROM ${tipo} ORDER BY nombre, id`)).rows;
  }
  async transaccion(accion) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const result = await accion(client);
      await client.query("COMMIT"); return result;
    } catch (e) {
      await client.query("ROLLBACK");
      if (e.code === "23505") throw fallo("Ya existe un registro con ese usuario, correo o documento", 409);
      if (e.code === "23503") throw fallo("El perfil seleccionado ya no existe", 409);
      throw e;
    } finally { client.release(); }
  }
  async auditar(client, tipo, id, actor, accion) {
    await client.query(`INSERT INTO auditorias (tipo_evento, descripcion, entidad_id, realizado_por, modulo_origen)
      VALUES ($1,$2,$3,$4,'ADMINISTRACION')`, [`${tipo.toUpperCase()}_${accion}`, `${accion === "CREADO" ? "Creación" : "Actualización"} de ${tipo}`, String(id), actor]);
  }
  async verificarActor(client, actor) {
    const result = await client.query("SELECT id FROM usuarios WHERE username=$1 AND rol='ADMINISTRADOR' AND activo=TRUE", [actor]);
    if (!result.rows.length) throw fallo("Tu cuenta ya no tiene permisos de administración", 403);
  }
  async guardarUsuario(id, datos, actor) {
    return this.transaccion(async client => {
      // Serializa cambios de roles, vínculos y del último administrador.
      await client.query("LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE");
      await this.verificarActor(client, actor);
      let previo;
      if (id) {
        previo = (await client.query("SELECT id, username, rol, activo FROM usuarios WHERE id=$1", [id])).rows[0];
        if (!previo) throw fallo("Usuario no encontrado", 404);
        if (previo.username === actor) throw fallo("No puedes modificar tu propia cuenta desde administración");
        if (previo.rol === "ADMINISTRADOR" && previo.activo && (!datos.activo || datos.rol !== "ADMINISTRADOR")) {
          const otros = await client.query("SELECT id FROM usuarios WHERE rol='ADMINISTRADOR' AND activo=TRUE AND id<>$1", [id]);
          if (!otros.rows.length) throw fallo("Debe permanecer al menos un administrador activo", 409);
        }
      }
      const campo = datos.rol === "MEDICO_TERAPISTA" ? "medico_id" : datos.rol === "PACIENTE" ? "paciente_id" : null;
      const perfilId = campo === "medico_id" ? datos.medicoId : campo === "paciente_id" ? datos.pacienteId : null;
      if (campo) {
        if (!perfilId) throw fallo("Selecciona el perfil correspondiente al rol");
        const tabla = campo === "medico_id" ? "medicos" : "pacientes";
        const perfil = (await client.query(`SELECT * FROM ${tabla} WHERE id=$1 FOR UPDATE`, [perfilId])).rows[0];
        if (!perfil) throw fallo("El perfil seleccionado no existe");
        if (datos.activo && !(campo === "medico_id" ? perfil.activo : perfil.estado === "ACTIVO")) throw fallo("Activa primero el perfil seleccionado");
        const vinculados = await client.query(`SELECT id FROM usuarios WHERE ${campo}=$1 AND ($2::bigint IS NULL OR id<>$2)`, [perfilId, id]);
        if (vinculados.rows.length) throw fallo("Este perfil ya está vinculado a otra cuenta", 409);
      }
      const values = [datos.username, datos.nombre, datos.email, datos.rol, datos.activo, campo === "medico_id" ? perfilId : null, campo === "paciente_id" ? perfilId : null];
      let result;
      if (id) {
        result = await client.query(`UPDATE usuarios SET username=$1, nombre=$2, email=$3, rol=$4, activo=$5,
          medico_id=$6, paciente_id=$7, password=COALESCE($8,password), updated_at=GREATEST(CURRENT_TIMESTAMP, updated_at + INTERVAL '1 millisecond')
          WHERE id=$9 RETURNING ${usuarioPublico}`, [...values, datos.passwordHash || null, id]);
      } else {
        result = await client.query(`INSERT INTO usuarios (username,nombre,email,rol,activo,medico_id,paciente_id,password)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${usuarioPublico}`, [...values, datos.passwordHash]);
      }
      await this.auditar(client, "usuarios", result.rows[0].id, actor, id ? "ACTUALIZADO" : "CREADO");
      return result.rows[0];
    });
  }
  async guardarPerfil(tipo, id, datos, actor) {
    const config = perfiles[tipo]; if (!config) throw fallo("Recurso inválido");
    return this.transaccion(async client => {
      await client.query("LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE");
      await this.verificarActor(client, actor);
      const values = config.keys.map(key => datos[key] ?? null);
      const result = id
        ? await client.query(`UPDATE ${tipo} SET ${config.columns.map((col,i) => `${col}=$${i+1}`).join(",")}, updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} RETURNING *`, [...values, id])
        : await client.query(`INSERT INTO ${tipo} (${config.columns.join(",")}) VALUES (${values.map((_,i) => `$${i+1}`).join(",")}) RETURNING *`, values);
      if (!result.rows.length) throw fallo("Registro no encontrado", 404);
      await this.auditar(client, tipo, result.rows[0].id, actor, id ? "ACTUALIZADO" : "CREADO");
      return result.rows[0];
    });
  }
  async eliminarPerfil(tipo, id, actor) {
    if (!perfiles[tipo]) throw fallo("Recurso inválido");
    const dependencias = tipo === "medicos"
      ? {
          query: `SELECT
            EXISTS (SELECT 1 FROM citas WHERE medico_id=$1) AS tiene_citas,
            EXISTS (SELECT 1 FROM controles_medicos WHERE medico_id=$1) AS tiene_controles,
            EXISTS (SELECT 1 FROM disponibilidades WHERE medico_id=$1) AS tiene_disponibilidades,
            EXISTS (SELECT 1 FROM usuarios WHERE medico_id=$1) AS tiene_cuenta`,
          nombres: [
            ["tiene_citas", "citas (incluidas las canceladas)"],
            ["tiene_controles", "controles médicos"],
            ["tiene_disponibilidades", "disponibilidad"],
            ["tiene_cuenta", "cuenta de usuario vinculada"]
          ]
        }
      : {
          query: `SELECT
            EXISTS (SELECT 1 FROM citas WHERE paciente_id=$1) AS tiene_citas,
            EXISTS (SELECT 1 FROM historias_clinicas WHERE paciente_id=$1) AS tiene_historia,
            EXISTS (SELECT 1 FROM usuarios WHERE paciente_id=$1) AS tiene_cuenta`,
          nombres: [
            ["tiene_citas", "citas (incluidas las canceladas)"],
            ["tiene_historia", "historia clínica"],
            ["tiene_cuenta", "cuenta de usuario vinculada"]
          ]
        };
    return this.transaccion(async client => {
      await this.verificarActor(client, actor);
      const perfil = await client.query(`SELECT id FROM ${tipo} WHERE id=$1 FOR UPDATE`, [id]);
      if (!perfil.rows.length) throw fallo("Registro no encontrado", 404);

      const relaciones = (await client.query(dependencias.query, [id])).rows[0];
      const encontradas = dependencias.nombres.filter(([campo]) => relaciones[campo]).map(([, nombre]) => nombre);
      if (encontradas.length) {
        throw fallo(`No se puede eliminar el perfil porque tiene ${encontradas.join(", ")}. Desactívalo en lugar de eliminarlo.`, 409);
      }

      await client.query(
        `INSERT INTO auditorias (tipo_evento, descripcion, entidad_id, realizado_por, modulo_origen, datos_adicionales)
         VALUES ($1,$2,$3,$4,'ADMINISTRACION',$5)`,
        [
          `${tipo.toUpperCase()}_ELIMINADO`,
          `Eliminación irreversible de perfil de ${tipo === "medicos" ? "médico" : "paciente"}`,
          String(id),
          actor,
          JSON.stringify({ tipoEntidad: tipo })
        ]
      );
      try {
        const resultado = await client.query(`DELETE FROM ${tipo} WHERE id=$1 RETURNING id`, [id]);
        if (!resultado.rows.length) throw fallo("Registro no encontrado", 404);
        return { id: resultado.rows[0].id, tipo, eliminado: true };
      } catch (error) {
        if (error.code === "23503") {
          throw fallo("No se puede eliminar el perfil porque tiene registros relacionados. Desactívalo en lugar de eliminarlo.", 409);
        }
        throw error;
      }
    });
  }
}
