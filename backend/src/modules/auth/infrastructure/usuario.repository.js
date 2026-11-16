const usuarioSelect = `
  SELECT u.id, u.username, u.password, u.rol, u.activo, u.created_at, u.updated_at,
    pe.nombre, pe.email,
    pr.id AS profesional_id, pa.id AS paciente_id,
    CASE WHEN u.rol='MEDICO_TERAPISTA' THEN COALESCE(pr.activo, FALSE)
         WHEN u.rol='PACIENTE' THEN pa.estado='ACTIVO' ELSE TRUE END AS perfil_activo
  FROM usuarios u
  JOIN personas pe ON pe.id=u.persona_id
  LEFT JOIN profesionales pr ON pr.persona_id=u.persona_id
  LEFT JOIN pacientes pa ON pa.persona_id=u.persona_id`;

export class UsuarioRepository {
  constructor(db) { this.db = db; }
  mapearUsuario(row) {
    if (!row) return null;
    return { id: Number(row.id), username: row.username, password: row.password, nombre: row.nombre,
      email: row.email, rol: row.rol, activo: row.activo, perfilActivo: row.perfil_activo,
      profesionalId: row.profesional_id == null ? null : Number(row.profesional_id), pacienteId: row.paciente_id == null ? null : Number(row.paciente_id),
      createdAt: row.created_at, updatedAt: row.updated_at };
  }
  async buscarPorUsername(username) {
    const result = await this.db.query(`${usuarioSelect} WHERE u.username=$1 LIMIT 1`, [username]); return this.mapearUsuario(result.rows[0]);
  }
  async listarPorRol(rol) {
    const result = await this.db.query(`${usuarioSelect} WHERE u.rol=$1`, [rol]); return result.rows.map(row => this.mapearUsuario(row));
  }
  async existePorUsername(username) {
    const result = await this.db.query("SELECT EXISTS(SELECT 1 FROM usuarios WHERE username=$1) AS existe", [username]); return result.rows[0].existe;
  }
  async existePorEmail(email) {
    const result = await this.db.query("SELECT EXISTS(SELECT 1 FROM personas WHERE LOWER(email)=LOWER($1)) AS existe", [email]); return result.rows[0].existe;
  }
  async buscarPorPacienteId(pacienteId) {
    const result = await this.db.query(`${usuarioSelect} WHERE pa.id=$1 LIMIT 1`, [pacienteId]); return this.mapearUsuario(result.rows[0]);
  }
  async existePorPacienteId(pacienteId) {
    const result = await this.db.query("SELECT EXISTS(SELECT 1 FROM usuarios u JOIN pacientes pa ON pa.persona_id=u.persona_id WHERE pa.id=$1) AS existe", [pacienteId]); return result.rows[0].existe;
  }
  async buscarPorId(id) {
    const result = await this.db.query(`${usuarioSelect} WHERE u.id=$1 LIMIT 1`, [id]); return this.mapearUsuario(result.rows[0]);
  }
}
