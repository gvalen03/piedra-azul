export class MedicoRepository {
  constructor(db) {
    this.db = db;
  }

  async listarTodos() {
    const result = await this.db.query(`
      SELECT
        id,
        nombre,
        apellido,
        activo
      FROM medicos
      ORDER BY id ASC
    `);

    return result.rows;
  }
  async buscarPorId(id) {
  const result = await this.db.query(
    `SELECT id, nombre, apellido, activo
     FROM medicos WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}
}