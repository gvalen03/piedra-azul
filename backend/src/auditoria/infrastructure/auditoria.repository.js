export class AuditoriaRepository {
  constructor(db) {
    this.db = db;
  }

  async guardar(auditoria) {
    const result = await this.db.query(
      `INSERT INTO auditorias (
         tipo_evento,
         descripcion,
         entidad_id,
         realizado_por,
         modulo_origen,
         datos_adicionales,
         fecha
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        auditoria.tipoEvento,
        auditoria.descripcion,
        auditoria.entidadId,
        auditoria.realizadoPor,
        auditoria.moduloOrigen,
        auditoria.datosAdicionales
      ]
    );

    return result.rows[0];
  }

  async listarTodos() {
    const result = await this.db.query(
      "SELECT * FROM auditorias ORDER BY id DESC"
    );

    return result.rows;
  }

  async listarPorTipo(tipoEvento) {
    const result = await this.db.query(
      "SELECT * FROM auditorias WHERE tipo_evento = $1 ORDER BY id DESC",
      [tipoEvento]
    );

    return result.rows;
  }

  async listarPorModulo(moduloOrigen) {
    const result = await this.db.query(
      "SELECT * FROM auditorias WHERE modulo_origen = $1 ORDER BY id DESC",
      [moduloOrigen]
    );

    return result.rows;
  }

  async listarPorUsuario(realizadoPor) {
    const result = await this.db.query(
      "SELECT * FROM auditorias WHERE realizado_por = $1 ORDER BY id DESC",
      [realizadoPor]
    );

    return result.rows;
  }

  async listarPorRangoFecha(fechaInicio, fechaFin) {
    const result = await this.db.query(
      `SELECT *
       FROM auditorias
       WHERE fecha BETWEEN $1 AND $2
       ORDER BY id DESC`,
      [fechaInicio, fechaFin]
    );

    return result.rows;
  }
}