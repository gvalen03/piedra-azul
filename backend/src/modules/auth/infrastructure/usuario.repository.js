export class UsuarioRepository {
  constructor(db) {
    this.db = db;
  }

  mapearUsuario(row) {
    if (!row) {
      return null;
    }

    return {
      // PostgreSQL devuelve BIGINT como texto; el dominio y el JWT usan números.
      id: Number(row.id),
      username: row.username,
      password: row.password,
      nombre: row.nombre,
      email: row.email,
      rol: row.rol,
      activo: row.activo,
      perfilActivo: row.perfil_activo,
      medicoId: row.medico_id == null ? null : Number(row.medico_id),
      pacienteId: row.paciente_id == null ? null : Number(row.paciente_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async buscarPorUsername(username) {
    const resultado = await this.db.query(
      `
      SELECT
        id,
        username,
        password,
        nombre,
        email,
        rol,
        activo,
        medico_id,
        paciente_id,
        created_at,
        updated_at,
        CASE WHEN rol='MEDICO_TERAPISTA' THEN EXISTS(SELECT 1 FROM medicos m WHERE m.id=usuarios.medico_id AND m.activo=TRUE)
             WHEN rol='PACIENTE' THEN EXISTS(SELECT 1 FROM pacientes p WHERE p.id=usuarios.paciente_id AND p.estado='ACTIVO')
             ELSE TRUE END AS perfil_activo
      FROM usuarios
      WHERE username = $1
      LIMIT 1
      `,
      [username]
    );

    return this.mapearUsuario(resultado.rows[0]);
  }

  async listarPorRol(rol) {
    const resultado = await this.db.query(
      `
      SELECT *
      FROM usuarios
      WHERE rol = $1
      `,
      [rol]
    );

    return resultado.rows.map((row) =>
      this.mapearUsuario(row)
    );
  }

  async existePorUsername(username) {
    const resultado = await this.db.query(
      `
      SELECT EXISTS(
        SELECT 1
        FROM usuarios
        WHERE username = $1
      ) AS existe
      `,
      [username]
    );

    return resultado.rows[0].existe;
  }

  async existePorEmail(email) {
    const resultado = await this.db.query(
      `
      SELECT EXISTS(
        SELECT 1
        FROM usuarios
        WHERE email = $1
      ) AS existe
      `,
      [email]
    );

    return resultado.rows[0].existe;
  }

  async buscarPorPacienteId(pacienteId) {
    const resultado = await this.db.query(
      `
      SELECT *
      FROM usuarios
      WHERE paciente_id = $1
      LIMIT 1
      `,
      [pacienteId]
    );

    return this.mapearUsuario(resultado.rows[0]);
  }

  async existePorPacienteId(pacienteId) {
    const resultado = await this.db.query(
      `
      SELECT EXISTS(
        SELECT 1
        FROM usuarios
        WHERE paciente_id = $1
      ) AS existe
      `,
      [pacienteId]
    );

    return resultado.rows[0].existe;
  }

  async buscarPorId(id) {
    const resultado = await this.db.query(
      `
      SELECT *
      FROM usuarios
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    return this.mapearUsuario(resultado.rows[0]);
  }
}
