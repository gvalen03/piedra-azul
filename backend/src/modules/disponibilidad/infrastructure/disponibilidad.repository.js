export class DisponibilidadRepository {
  constructor(db) { this.db = db; }

  async guardar(d) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const profesional = await client.query("SELECT id FROM profesionales WHERE id=$1 AND activo=TRUE FOR UPDATE", [d.profesionalId]);
      if (!profesional.rows.length) throw Object.assign(new Error("Profesional no disponible"), { statusCode: 400 });
      const cruce = await client.query(`SELECT id FROM disponibilidades WHERE profesional_id=$1 AND dia_semana=$2 AND activo=TRUE
        AND hora_inicio < $4::time AND hora_fin > $3::time
        AND NOT (hora_inicio=$3::time AND hora_fin=$4::time)`, [d.profesionalId, d.diaSemana, d.horaInicio, d.horaFin]);
      if (cruce.rows.length) throw Object.assign(new Error("El bloque se superpone con otro horario activo"), { statusCode: 409 });
      const result = await client.query(
      `INSERT INTO disponibilidades
        (profesional_id, dia_semana, hora_inicio, hora_fin, intervalo_minutos, semanas_habilitadas, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (profesional_id, dia_semana, hora_inicio, hora_fin)
       DO UPDATE SET intervalo_minutos=EXCLUDED.intervalo_minutos, semanas_habilitadas=EXCLUDED.semanas_habilitadas,
         activo=EXCLUDED.activo, updated_at=CURRENT_TIMESTAMP
       RETURNING *`,
      [d.profesionalId, d.diaSemana, d.horaInicio, d.horaFin, d.intervaloMinutos, d.semanasHabilitadas, d.activo]
    );
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async actualizar(id, d) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const profesional = await client.query(
        "SELECT id FROM profesionales WHERE id=$1 AND activo=TRUE FOR UPDATE",
        [d.profesionalId]
      );
      if (!profesional.rows.length) throw Object.assign(new Error("Profesional no disponible"), { statusCode: 400 });

      const actual = await client.query(
        "SELECT id FROM disponibilidades WHERE id=$1 AND profesional_id=$2 AND activo=TRUE FOR UPDATE",
        [id, d.profesionalId]
      );
      if (!actual.rows.length) throw Object.assign(new Error("Bloque no encontrado"), { statusCode: 404 });

      const cruce = await client.query(`SELECT id FROM disponibilidades WHERE profesional_id=$1 AND dia_semana=$2 AND id<>$5
        AND ((activo=TRUE AND hora_inicio < $4::time AND hora_fin > $3::time)
          OR (hora_inicio=$3::time AND hora_fin=$4::time))`,
      [d.profesionalId, d.diaSemana, d.horaInicio, d.horaFin, id]);
      if (cruce.rows.length) throw Object.assign(new Error("El horario se superpone o ya existe un bloque con las mismas horas"), { statusCode: 409 });

      const result = await client.query(
        `UPDATE disponibilidades SET dia_semana=$3, hora_inicio=$4, hora_fin=$5,
          intervalo_minutos=$6, semanas_habilitadas=$7,
          updated_at=CURRENT_TIMESTAMP
         WHERE id=$1 AND profesional_id=$2 AND activo=TRUE RETURNING *`,
        [id, d.profesionalId, d.diaSemana, d.horaInicio, d.horaFin, d.intervaloMinutos, d.semanasHabilitadas]
      );
      await client.query("COMMIT");
      return result.rows[0] ?? null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async buscarPorProfesional(profesionalId) {
    const result = await this.db.query(
      `SELECT * FROM disponibilidades WHERE profesional_id=$1 AND activo=TRUE ORDER BY dia_semana, hora_inicio`,
      [profesionalId]
    );
    return result.rows;
  }

  async buscarPorProfesionalYDia(profesionalId, diaSemana) {
    const result = await this.db.query(
      `SELECT * FROM disponibilidades WHERE profesional_id=$1 AND dia_semana=$2 AND activo=TRUE AND EXISTS (SELECT 1 FROM profesionales WHERE id=$1 AND activo=TRUE) ORDER BY hora_inicio`,
      [profesionalId, diaSemana]
    );
    return result.rows;
  }

  async desactivar(id, profesionalId) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM profesionales WHERE id=$1 FOR UPDATE", [profesionalId]);
      const result = await client.query("UPDATE disponibilidades SET activo=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND profesional_id=$2 AND activo=TRUE RETURNING id", [id, profesionalId]);
      await client.query("COMMIT");
      return result.rows[0] ?? null;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
