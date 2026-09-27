const fallo = (message, statusCode) => Object.assign(new Error(message), { statusCode });
export class HistorialRepository {
  constructor(db) { this.db = db; }

  async listarControlesPorPaciente(pacienteId) {
    const result = await this.db.query(`SELECT cm.*, m.nombre AS medico_nombre, m.apellido AS medico_apellido,
      c.fecha::text AS fecha_cita, c.hora_inicio
      FROM controles_medicos cm JOIN historias_clinicas h ON h.id=cm.historia_clinica_id
      JOIN medicos m ON m.id=cm.medico_id JOIN citas c ON c.id=cm.cita_id
      WHERE h.paciente_id=$1 ORDER BY cm.fecha DESC, cm.id DESC`, [pacienteId]);
    return result.rows;
  }

  async pacienteDeCita(citaId, medicoId) {
    const result = await this.db.query("SELECT paciente_id FROM citas WHERE id=$1 AND medico_id=$2", [citaId, medicoId]);
    if (!result.rows.length) throw fallo("Cita no encontrada", 404);
    return result.rows[0].paciente_id;
  }

  async registrarAtencion(citaId, medicoId, datos) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`SELECT *, (fecha + hora_inicio) <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota') AS iniciada
        FROM citas WHERE id=$1 AND medico_id=$2 FOR UPDATE`, [citaId, medicoId]);
      const cita = result.rows[0];
      if (!cita) throw fallo("Cita no encontrada", 404);
      if (!["PROGRAMADA", "CONFIRMADA"].includes(cita.estado)) throw fallo("La cita ya fue atendida o está cancelada", 409);
      if (!cita.iniciada) throw fallo("La atención solo puede registrarse desde la hora de inicio de la cita", 409);
      const previo = await client.query("SELECT id FROM controles_medicos WHERE cita_id=$1", [citaId]);
      if (previo.rows.length) throw fallo("Esta cita ya tiene una atención registrada", 409);
      const historia = await client.query(`INSERT INTO historias_clinicas (paciente_id) VALUES ($1)
        ON CONFLICT (paciente_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP RETURNING id`, [cita.paciente_id]);
      const control = await client.query(`INSERT INTO controles_medicos
        (historia_clinica_id, cita_id, medico_id, motivo_consulta, observaciones, diagnostico, tratamiento, recomendaciones)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [historia.rows[0].id, citaId, medicoId, datos.motivoConsulta, datos.observaciones, datos.diagnostico, datos.tratamiento, datos.recomendaciones]);
      await client.query("UPDATE citas SET estado='ATENDIDA', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [citaId]);
      await client.query("COMMIT");
      return control.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
