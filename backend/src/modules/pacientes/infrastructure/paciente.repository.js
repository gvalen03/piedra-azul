export class PacienteRepository {
  constructor(db) {
    this.db = db;
  }

  async buscarPorDocumento(numeroDocumento) {
    const result = await this.db.query(
      "SELECT * FROM pacientes WHERE numero_documento = $1 LIMIT 1",
      [numeroDocumento]
    );

    return result.rows[0] ?? null;
  }

  async buscarPorEmail(email) {
    const result = await this.db.query(
      "SELECT * FROM pacientes WHERE email = $1 LIMIT 1",
      [email]
    );

    return result.rows[0] ?? null;
  }

  async buscarPorId(id) {
    const result = await this.db.query(
      "SELECT * FROM pacientes WHERE id = $1 LIMIT 1",
      [id]
    );

    return result.rows[0] ?? null;
  }

  async listarTodos() {
    const result = await this.db.query(
      "SELECT * FROM pacientes ORDER BY id ASC"
    );

    return result.rows;
  }

  async listarPorEstado(estado) {
    const result = await this.db.query(
      "SELECT * FROM pacientes WHERE estado = $1 ORDER BY id ASC",
      [estado]
    );

    return result.rows;
  }

  async existePorDocumento(numeroDocumento) {
    const result = await this.db.query(
      "SELECT 1 FROM pacientes WHERE numero_documento = $1 LIMIT 1",
      [numeroDocumento]
    );

    return result.rowCount > 0;
  }

  async existePorEmail(email) {
    const result = await this.db.query(
      "SELECT 1 FROM pacientes WHERE email = $1 LIMIT 1",
      [email]
    );

    return result.rowCount > 0;
  }

  async guardar(paciente) {
    if (paciente.id) {
      const result = await this.db.query(
        `UPDATE pacientes
         SET nombre = $1,
             apellido = $2,
             numero_documento = $3,
             fecha_nacimiento = $4,
             email = $5,
             telefono = $6,
             direccion = $7,
             eps = $8,
             estado = $9,
             genero = $10,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $11
         RETURNING *`,
        [
          paciente.nombre,
          paciente.apellido,
          paciente.numeroDocumento,
          paciente.fechaNacimiento,
          paciente.email,
          paciente.telefono,
          paciente.direccion,
          paciente.eps,
          paciente.estado,
          paciente.genero,
          paciente.id
        ]
      );

      return result.rows[0];
    }

    const result = await this.db.query(
      `INSERT INTO pacientes (
         nombre,
         apellido,
         numero_documento,
         fecha_nacimiento,
         email,
         telefono,
         direccion,
         eps,
         estado,
         genero
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        paciente.nombre,
        paciente.apellido,
        paciente.numeroDocumento,
        paciente.fechaNacimiento,
        paciente.email,
        paciente.telefono,
        paciente.direccion,
        paciente.eps,
        paciente.estado,
        paciente.genero
      ]
    );

    return result.rows[0];
  }
}