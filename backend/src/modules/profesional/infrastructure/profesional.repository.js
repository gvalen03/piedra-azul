
export class ProfesionalRepository {
  constructor(db) {
    this.db = db;
  }

  async listarTodos() {
    const result = await this.db.query(`
      SELECT
        pr.id,
        p.nombre,
        p.apellido,
        pr.activo
      FROM profesionales pr
      JOIN personas p ON p.id = pr.persona_id
      ORDER BY pr.id ASC
    `);

    return result.rows;
  }

  async buscarPorId(id) {
    const result = await this.db.query(
      `SELECT
        pr.id,
        p.nombre,
        p.apellido,
        pr.activo
      FROM profesionales pr
      JOIN personas p ON p.id = pr.persona_id
      WHERE pr.id = $1`,
      [id]
    );

    return result.rows[0] ?? null;
  }
}
