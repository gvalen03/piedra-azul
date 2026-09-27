export class CitaRepository {
  constructor(db) {
    this.db = db;
  }

  async guardar(cita) {
    const result = await this.db.query(
      `
      INSERT INTO citas (
        paciente_id,
        medico_id,
        fecha,
        hora_inicio,
        hora_fin,
        estado,
        motivo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        cita.pacienteId,
        cita.medicoId,
        cita.fecha,
        cita.horaInicio,
        cita.horaFin,
        cita.estado,
        cita.motivo
      ]
    );

    return result.rows[0];
  }

  async buscarPorId(id) {
    const result = await this.db.query(
      `
      SELECT *
      FROM citas
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async listarPorMedicoYFecha(medicoId, fecha) {
    const result = await this.db.query(
      `
      SELECT *
      FROM citas
      WHERE medico_id = $1
        AND fecha = $2
        AND estado <> 'CANCELADA'
      ORDER BY hora_inicio ASC
      `,
      [medicoId, fecha]
    );

    return result.rows;
  }

  async existeCitaEnHorario(
    medicoId,
    fecha,
    horaInicio
  ) {
    const result = await this.db.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM citas
        WHERE medico_id = $1
          AND fecha = $2
          AND hora_inicio = $3
          AND estado <> 'CANCELADA'
      ) AS existe
      `,
      [
        medicoId,
        fecha,
        horaInicio
      ]
    );

    return result.rows[0].existe;
  }

  async listarPorPaciente(pacienteId) {
    const result = await this.db.query(
      `
      SELECT *
      FROM citas
      WHERE paciente_id = $1
      ORDER BY fecha DESC, hora_inicio DESC
      `,
      [pacienteId]
    );

    return result.rows;
  }

  async actualizarEstado(id, estado) {
    const result = await this.db.query(
      `
      UPDATE citas
      SET
        estado = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        estado
      ]
    );

    return result.rows[0] ?? null;
  }
}