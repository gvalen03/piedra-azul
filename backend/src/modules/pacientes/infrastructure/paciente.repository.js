const columnasPaciente = `
  pa.id, pa.persona_id, pa.eps, pa.estado, pa.created_at, pa.updated_at,
  pe.nombre, pe.apellido, pe.numero_documento, pe.fecha_nacimiento::text AS fecha_nacimiento,
  pe.email, pe.telefono, pe.direccion, pe.genero`;

export class PacienteRepository {
  constructor(db) { this.db = db; }

  async actualizarContacto(id, { email, telefono, direccion }) {
    const result = await this.db.query(`UPDATE personas pe SET email=$2, telefono=$3, direccion=$4, updated_at=CURRENT_TIMESTAMP
      FROM pacientes pa WHERE pa.id=$1 AND pa.persona_id=pe.id RETURNING ${columnasPaciente}`, [id, email, telefono, direccion]);
    return result.rows[0] ?? null;
  }
  async buscarPorDocumento(numeroDocumento) {
    const result = await this.db.query(`SELECT ${columnasPaciente} FROM pacientes pa JOIN personas pe ON pe.id=pa.persona_id
      WHERE pe.numero_documento=$1 LIMIT 1`, [numeroDocumento]); return result.rows[0] ?? null;
  }
  async buscarPorEmail(email) {
    const result = await this.db.query(`SELECT ${columnasPaciente} FROM pacientes pa JOIN personas pe ON pe.id=pa.persona_id
      WHERE LOWER(pe.email)=LOWER($1) LIMIT 1`, [email]); return result.rows[0] ?? null;
  }
  async buscarPorId(id) {
    const result = await this.db.query(`SELECT ${columnasPaciente} FROM pacientes pa JOIN personas pe ON pe.id=pa.persona_id
      WHERE pa.id=$1 LIMIT 1`, [id]); return result.rows[0] ?? null;
  }
  async listarTodos() {
    const result = await this.db.query(`SELECT ${columnasPaciente} FROM pacientes pa JOIN personas pe ON pe.id=pa.persona_id
      ORDER BY pe.nombre, pe.apellido, pa.id`); return result.rows;
  }
  async listarPorEstado(estado) {
    const result = await this.db.query(`SELECT ${columnasPaciente} FROM pacientes pa JOIN personas pe ON pe.id=pa.persona_id
      WHERE pa.estado=$1 ORDER BY pe.nombre, pe.apellido, pa.id`, [estado]); return result.rows;
  }
  async existePorDocumento(numeroDocumento) {
    const result = await this.db.query("SELECT 1 FROM personas WHERE numero_documento=$1 LIMIT 1", [numeroDocumento]); return result.rowCount > 0;
  }
  async existePorEmail(email) {
    const result = await this.db.query("SELECT 1 FROM personas WHERE LOWER(email)=LOWER($1) LIMIT 1", [email]); return result.rowCount > 0;
  }
  async registrarConAuditoria(paciente, origen) {
    const client = await this.db.connect();
    try { await client.query("BEGIN"); const guardado = await new PacienteRepository(client).guardar(paciente);
      await client.query(`INSERT INTO auditorias (tipo_evento, descripcion, entidad_id, realizado_por, modulo_origen)
        VALUES ('PACIENTE_REGISTRADO','Registro de paciente',$1,$2,'PACIENTES')`, [String(guardado.id), origen]);
      await client.query("COMMIT"); return guardado;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async guardar(paciente) {
    if (paciente.id) {
      const persona = await this.db.query(`UPDATE personas SET nombre=$1, apellido=$2, numero_documento=$3, fecha_nacimiento=$4,
        email=$5, telefono=$6, direccion=$7, genero=$8, updated_at=CURRENT_TIMESTAMP
        WHERE id=(SELECT persona_id FROM pacientes WHERE id=$9) RETURNING id`,
      [paciente.nombre, paciente.apellido, paciente.numeroDocumento, paciente.fechaNacimiento, paciente.email, paciente.telefono, paciente.direccion, paciente.genero, paciente.id]);
      if (!persona.rows.length) return null;
      await this.db.query("UPDATE pacientes SET eps=$1, estado=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3", [paciente.eps, paciente.estado, paciente.id]);
      return this.buscarPorId(paciente.id);
    }
    const persona = await this.db.query(`INSERT INTO personas (nombre, apellido, numero_documento, fecha_nacimiento, email, telefono, direccion, genero)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [paciente.nombre, paciente.apellido, paciente.numeroDocumento, paciente.fechaNacimiento, paciente.email, paciente.telefono, paciente.direccion, paciente.genero]);
    const result = await this.db.query("INSERT INTO pacientes (persona_id, eps, estado) VALUES ($1,$2,$3) RETURNING id", [persona.rows[0].id, paciente.eps, paciente.estado]);
    return this.buscarPorId(result.rows[0].id);
  }
}