const fallo = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const usuarioPublico = "id, username, nombre, email, rol, activo, medico_id, paciente_id";
const perfiles = {
  medicos: { columns: ["nombre", "apellido", "numero_documento", "email", "telefono", "activo"], keys: ["nombre", "apellido", "numeroDocumento", "email", "telefono", "activo"] },
  pacientes: { columns: ["nombre", "apellido", "numero_documento", "fecha_nacimiento", "email", "telefono", "direccion", "eps", "genero", "estado"], keys: ["nombre", "apellido", "numeroDocumento", "fechaNacimiento", "email", "telefono", "direccion", "eps", "genero", "estado"] }
};
// ADM-01: un perfil está activo si medicos.activo es TRUE o pacientes.estado es 'ACTIVO'.
const perfilActivo = (tipo, perfil) => tipo === "medicos" ? perfil.activo === true : perfil.estado === "ACTIVO";
const etiquetaPerfil = { medicos: "médico", pacientes: "paciente" };
const CODIGOS_REINTENTABLES = ["40P01", "40001"]; // deadlock / fallo de serialización

export class AdminRepository {
  // `citaRepository` aporta las consultas de citas pendientes (ADM-01).
  constructor(db, { citaRepository } = {}) { this.db = db; this.citas = citaRepository; }
  async listar(tipo) {
    if (tipo === "usuarios") return (await this.db.query(`SELECT ${usuarioPublico} FROM usuarios ORDER BY nombre, id`)).rows;
    if (!perfiles[tipo]) throw fallo("Recurso inválido");
    const fecha = tipo === "pacientes" ? ", fecha_nacimiento::text AS fecha_nacimiento" : "";
    return (await this.db.query(`SELECT *${fecha} FROM ${tipo} ORDER BY nombre, id`)).rows;
  }
  async transaccion(accion) {
    for (let intento = 1; ; intento++) {
      const client = await this.db.connect();
      try {
        await client.query("BEGIN");
        const result = await accion(client);
        await client.query("COMMIT"); return result;
      } catch (e) {
        await client.query("ROLLBACK");
        if (CODIGOS_REINTENTABLES.includes(e.code)) {
          if (intento < 2) continue; // un reintento: se vuelve a validar todo desde cero
          throw fallo("Hubo un cambio simultáneo en los datos. Actualiza e inténtalo de nuevo.", 409);
        }
        if (e.code === "23505") throw fallo("Ya existe un registro con ese usuario, correo o documento", 409);
        if (e.code === "23503") throw fallo("El perfil seleccionado ya no existe", 409);
        throw e;
      } finally { client.release(); }
    }
  }
  async auditar(client, tipo, id, actor, accion, { descripcion, datos = null } = {}) {
    await client.query(`INSERT INTO auditorias (tipo_evento, descripcion, entidad_id, realizado_por, modulo_origen, datos_adicionales)
      VALUES ($1,$2,$3,$4,'ADMINISTRACION',$5)`, [`${tipo.toUpperCase()}_${accion}`,
      descripcion ?? `${accion === "CREADO" ? "Creación" : "Actualización"} de ${tipo}`, String(id), actor, datos]);
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
      if (id) {
        // ADM-01: el PUT genérico edita datos, pero no puede pasar un perfil de
        // activo a inactivo (ni al revés): eso exige el flujo con confirmación.
        const actual = (await client.query(`SELECT * FROM ${tipo} WHERE id=$1 FOR UPDATE`, [id])).rows[0];
        if (!actual) throw fallo("Registro no encontrado", 404);
        const pedidoActivo = tipo === "medicos" ? datos.activo === true : datos.estado === "ACTIVO";
        if (pedidoActivo !== perfilActivo(tipo, actual)) {
          throw fallo("El estado solo puede cambiarse con las acciones Desactivar o Reactivar del perfil");
        }
      }
      const values = config.keys.map(key => datos[key] ?? null);
      const result = id
        ? await client.query(`UPDATE ${tipo} SET ${config.columns.map((col,i) => `${col}=$${i+1}`).join(",")}, updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} RETURNING *`, [...values, id])
        : await client.query(`INSERT INTO ${tipo} (${config.columns.join(",")}) VALUES (${values.map((_,i) => `$${i+1}`).join(",")}) RETURNING *`, values);
      if (!result.rows.length) throw fallo("Registro no encontrado", 404);
      await this.auditar(client, tipo, result.rows[0].id, actor, id ? "ACTUALIZADO" : "CREADO");
      return result.rows[0];
    });
  }
  // =========================
  // ADM-01: desactivación / reactivación de médicos y pacientes
  // =========================

  #validarTipo(tipo) {
    if (!etiquetaPerfil[tipo]) throw fallo("Solo se pueden desactivar médicos y pacientes");
    if (!this.citas) throw new Error("AdminRepository requiere citaRepository para ADM-01");
  }

  // Bloquea la fila del perfil con el mismo bloqueo exclusivo que el agendamiento
  // toma sobre el médico (FOR UPDATE) y que el paciente cede (FOR SHARE).
  async #bloquearPerfil(client, tipo, id) {
    const perfil = (await client.query(`SELECT * FROM ${tipo} WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!perfil) throw fallo("Registro no encontrado", 404);
    return perfil;
  }

  /** Vista previa: cuántas citas pendientes se cancelarían (sin cambiar nada). */
  async previsualizarDesactivacion(tipo, id) {
    this.#validarTipo(tipo);
    const perfil = (await this.db.query(`SELECT * FROM ${tipo} WHERE id=$1`, [id])).rows[0];
    if (!perfil) throw fallo("Registro no encontrado", 404);
    const citas = await this.citas.listarPendientesDePerfil(this.db, tipo, id);
    return {
      tipo, id: perfil.id, nombre: `${perfil.nombre} ${perfil.apellido}`,
      activo: perfilActivo(tipo, perfil), cantidad: citas.length, citas
    };
  }

  /**
   * Desactiva el perfil y cancela sus citas futuras pendientes en UNA transacción.
   * Bajo el bloqueo del perfil se recuenta: si difiere de `cantidadEsperada` (lo que
   * vio el administrador) responde 409 con el valor actual y no cambia nada.
   */
  async desactivarPerfil(tipo, id, cantidadEsperada, actor) {
    this.#validarTipo(tipo);
    return this.transaccion(async client => {
      await this.verificarActor(client, actor);
      const perfil = await this.#bloquearPerfil(client, tipo, id);
      if (!perfilActivo(tipo, perfil)) throw fallo(`El ${etiquetaPerfil[tipo]} ya está inactivo`, 409);

      const pendientes = await this.citas.listarPendientesDePerfil(client, tipo, id, { bloquear: true });
      if (pendientes.length !== cantidadEsperada) {
        throw Object.assign(
          fallo(`La cantidad de citas pendientes cambió (ahora ${pendientes.length}). Revisa y confirma de nuevo.`, 409),
          { detalles: { cantidadEsperada, cantidadActual: pendientes.length, citas: pendientes } }
        );
      }

      const actualizado = (await client.query(
        tipo === "medicos"
          ? "UPDATE medicos SET activo=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *"
          : "UPDATE pacientes SET estado='INACTIVO', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *", [id])).rows[0];
      const canceladas = await this.citas.cancelarPendientesPorIds(client, pendientes.map(c => c.id));

      await this.auditar(client, tipo, id, actor, "DESACTIVADO", {
        descripcion: `Desactivación de ${etiquetaPerfil[tipo]} con cancelación de ${canceladas.length} cita(s) futura(s) pendiente(s)`,
        datos: { tipoPerfil: etiquetaPerfil[tipo].toUpperCase(), perfilId: String(id), cantidadCanceladas: canceladas.length, citasCanceladas: canceladas }
      });
      return { perfil: actualizado, cantidadCanceladas: canceladas.length, citasCanceladas: canceladas };
    });
  }

  /** Reactiva el perfil. Solo cambia su estado: las citas canceladas NO se restauran. */
  async reactivarPerfil(tipo, id, actor) {
    this.#validarTipo(tipo);
    return this.transaccion(async client => {
      await this.verificarActor(client, actor);
      const perfil = await this.#bloquearPerfil(client, tipo, id);
      if (perfilActivo(tipo, perfil)) throw fallo(`El ${etiquetaPerfil[tipo]} ya está activo`, 409);
      const actualizado = (await client.query(
        tipo === "medicos"
          ? "UPDATE medicos SET activo=TRUE, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *"
          : "UPDATE pacientes SET estado='ACTIVO', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *", [id])).rows[0];
      await this.auditar(client, tipo, id, actor, "REACTIVADO", {
        descripcion: `Reactivación de ${etiquetaPerfil[tipo]} (las citas canceladas no se restauran)`,
        datos: { tipoPerfil: etiquetaPerfil[tipo].toUpperCase(), perfilId: String(id) }
      });
      return { perfil: actualizado };
    });
  }
}
