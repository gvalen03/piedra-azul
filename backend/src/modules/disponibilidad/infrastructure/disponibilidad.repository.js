export class DisponibilidadRepository {
  constructor(db) { this.db = db; }

  async guardar(d) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const medico = await client.query("SELECT id FROM medicos WHERE id=$1 AND activo=TRUE FOR UPDATE", [d.medicoId]);
      if (!medico.rows.length) throw Object.assign(new Error("Médico no disponible"), { statusCode: 400 });
      const cruce = await client.query(`SELECT id FROM disponibilidades WHERE medico_id=$1 AND dia_semana=$2 AND activo=TRUE
        AND hora_inicio < $4::time AND hora_fin > $3::time
        AND NOT (hora_inicio=$3::time AND hora_fin=$4::time)`, [d.medicoId, d.diaSemana, d.horaInicio, d.horaFin]);
      if (cruce.rows.length) throw Object.assign(new Error("El bloque se superpone con otro horario activo"), { statusCode: 409 });
      const result = await client.query(
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
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
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
      `SELECT * FROM disponibilidades WHERE medico_id=$1 AND dia_semana=$2 AND activo=TRUE ORDER BY hora_inicio`,
      [medicoId, diaSemana]
    );
    return result.rows;
  }

  async desactivar(id, medicoId) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM medicos WHERE id=$1 FOR UPDATE", [medicoId]);
      const result = await client.query("UPDATE disponibilidades SET activo=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND medico_id=$2 AND activo=TRUE RETURNING id", [id, medicoId]);
      await client.query("COMMIT");
      return result.rows[0] ?? null;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
