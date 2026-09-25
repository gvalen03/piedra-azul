export class DisponibilidadRepository {
  constructor(db) { this.db = db; }

  async guardar(d) {
    const result = await this.db.query(
      `INSERT INTO disponibilidades
        (medico_id, dia_semana, hora_inicio, hora_fin, intervalo_minutos, semanas_habilitadas, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (medico_id, dia_semana, hora_inicio, hora_fin)
       DO UPDATE SET intervalo_minutos = EXCLUDED.intervalo_minutos,
         semanas_habilitadas = EXCLUDED.semanas_habilitadas,
         activo = EXCLUDED.activo, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [d.medicoId, d.diaSemana, d.horaInicio, d.horaFin, d.intervaloMinutos, d.semanasHabilitadas, d.activo]
    );
    return result.rows[0];
  }

  async buscarPorMedico(medicoId) {
    const result = await this.db.query(
      `SELECT * FROM disponibilidades WHERE medico_id=$1 AND activo=TRUE ORDER BY dia_semana, hora_inicio`,
      [medicoId]
    );
    return result.rows;
  }

  async buscarPorMedicoYDia(medicoId, diaSemana) {
    const result = await this.db.query(
      `SELECT * FROM disponibilidades WHERE medico_id=$1 AND dia_semana=$2 AND activo=TRUE LIMIT 1`,
      [medicoId, diaSemana]
    );
    return result.rows[0] ?? null;
  }

  async eliminarPorMedico(medicoId) {
    await this.db.query(
      `UPDATE disponibilidades SET activo=FALSE, updated_at=CURRENT_TIMESTAMP WHERE medico_id=$1`,
      [medicoId]
    );
  }
}