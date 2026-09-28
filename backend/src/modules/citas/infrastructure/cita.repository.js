import { DisponibilidadRepository }
  from "../../disponibilidad/infrastructure/disponibilidad.repository.js";

import { DisponibilidadService }
  from "../../disponibilidad/application/disponibilidad.service.js";

export class CitaRepository {
  constructor(db) {
    this.db = db;
  }

  // =========================
  // Agenda del médico
  // =========================

  async listarAgendaMedico(medicoId, fecha) {
    const result = await this.db.query(
      `
      SELECT
        c.*,
        c.fecha::text AS fecha,
        p.nombre AS paciente_nombre,
        p.apellido AS paciente_apellido,
        p.numero_documento AS paciente_documento
      FROM citas c
      JOIN pacientes p
        ON p.id = c.paciente_id
      WHERE c.medico_id = $1
        AND c.fecha = $2
      ORDER BY c.hora_inicio ASC
      `,
      [medicoId, fecha]
    );

    return result.rows;
  }

  // =========================
  // Guardar cita
  // =========================

  async guardar(cita) {
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const medico = await client.query(
        `
        SELECT id
        FROM medicos
        WHERE id = $1
          AND activo = TRUE
        FOR UPDATE
        `,
        [cita.medicoId]
      );

      if (!medico.rows.length) {
        throw new Error(
          "El médico no está disponible"
        );
      }

      const paciente = await client.query(
        `
        SELECT id
        FROM pacientes
        WHERE id = $1
          AND estado = 'ACTIVO'
        FOR SHARE
        `,
        [cita.pacienteId]
      );

      if (!paciente.rows.length) {
        throw new Error(
          "El paciente no está disponible"
        );
      }

      // Revalidar disponibilidad dentro
      // de la misma transacción.
      const disponibilidadService =
        new DisponibilidadService({
          disponibilidadRepository:
            new DisponibilidadRepository(client),

          citaRepository:
            new CitaRepository(client)
        });

      const franjas =
        await disponibilidadService
          .obtenerFranjasDisponibles({
            medicoId: cita.medicoId,
            fecha: cita.fecha
          });

      const horarioDisponible =
        franjas.some(
          (franja) =>
            franja.horaInicio === cita.horaInicio &&
            franja.horaFin === cita.horaFin
        );

      if (!horarioDisponible) {
        throw new Error(
          "El horario seleccionado no está disponible"
        );
      }

      const result = await client.query(
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
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        )
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

      await client.query("COMMIT");

      return result.rows[0];

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }
  }

  // =========================
  // Buscar por ID
  // =========================

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

  // =========================
  // Listar por médico y fecha
  // =========================

  async listarPorMedicoYFecha(
    medicoId,
    fecha
  ) {
    const result = await this.db.query(
      `
      SELECT *
      FROM citas
      WHERE medico_id = $1
        AND fecha = $2
        AND estado <> 'CANCELADA'
      ORDER BY hora_inicio ASC
      `,
      [
        medicoId,
        fecha
      ]
    );

    return result.rows;
  }

  // =========================
  // Verificar horario ocupado
  // =========================

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

  // =========================
  // Cambio de estado por paciente
  // =========================

  async cambiarEstadoPaciente(
    id,
    pacienteId,
    estado
  ) {
    const result = await this.db.query(
      `
      UPDATE citas
      SET
        estado = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND paciente_id = $2
        AND (
          fecha + hora_inicio
        ) > (
          CURRENT_TIMESTAMP
          AT TIME ZONE 'America/Bogota'
        )
        AND (
          estado = 'PROGRAMADA'
          OR (
            estado = 'CONFIRMADA'
            AND $3 = 'CANCELADA'
          )
        )
      RETURNING *
      `,
      [
        id,
        pacienteId,
        estado
      ]
    );

    return result.rows[0] ?? null;
  }

  // =========================
  // Citas del paciente
  // =========================

  async listarPorPaciente(pacienteId) {
    const result = await this.db.query(
      `
      SELECT
        c.*,
        c.fecha::text AS fecha,
        m.nombre AS medico_nombre,
        m.apellido AS medico_apellido
      FROM citas c
      JOIN medicos m
        ON m.id = c.medico_id
      WHERE c.paciente_id = $1
      ORDER BY
        c.fecha DESC,
        c.hora_inicio DESC
      `,
      [pacienteId]
    );

    return result.rows;
  }

  // =========================
  // Auditoría
  // =========================

  async auditar(
    client,
    id,
    actor,
    evento,
    detalles = null
  ) {
    await client.query(
      `
      INSERT INTO auditorias (
        tipo_evento,
        descripcion,
        entidad_id,
        realizado_por,
        modulo_origen,
        datos_adicionales
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'CITAS',
        $5
      )
      `,
      [
        evento,
        "Gestión de cita desde agenda",
        String(id),
        actor || "SISTEMA",
        detalles
      ]
    );
  }

  // =========================
  // Actualizar estado
  // =========================

  async actualizarEstado(
    id,
    estado,
    actor
  ) {
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
        UPDATE citas
        SET
          estado = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND (
            fecha + hora_inicio
          ) > (
            CURRENT_TIMESTAMP
            AT TIME ZONE 'America/Bogota'
          )
          AND (
            estado = 'PROGRAMADA'
            OR (
              estado = 'CONFIRMADA'
              AND $2 = 'CANCELADA'
            )
          )
        RETURNING *
        `,
        [
          id,
          estado
        ]
      );

      if (!result.rows.length) {
        throw Object.assign(
          new Error(
            "La cita cambió, ya inició o no admite esta acción. Actualiza la agenda."
          ),
          {
            statusCode: 409
          }
        );
      }

      await this.auditar(
        client,
        id,
        actor,
        `CITA_${estado}`
      );

      await client.query("COMMIT");

      return result.rows[0];

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }
  }

  // =========================
  // Reprogramar cita
  // =========================

  async reprogramar(
    id,
    { fecha, horaInicio },
    actor
  ) {
    const client = await this.db.connect();

    const fallo = (mensaje) =>
      Object.assign(
        new Error(mensaje),
        {
          statusCode: 409
        }
      );

    try {
      await client.query("BEGIN");

      const originalResult =
        await client.query(
          `
          SELECT medico_id
          FROM citas
          WHERE id = $1
          `,
          [id]
        );

      const original =
        originalResult.rows[0];

      if (!original) {
        throw Object.assign(
          new Error(
            "Cita no encontrada"
          ),
          {
            statusCode: 404
          }
        );
      }

      // Mantener el mismo orden de bloqueo
      // utilizado al reservar.
      const medico =
        await client.query(
          `
          SELECT id
          FROM medicos
          WHERE id = $1
            AND activo = TRUE
          FOR UPDATE
          `,
          [original.medico_id]
        );

      if (!medico.rows.length) {
        throw fallo(
          "El médico no está disponible"
        );
      }

      const citaResult =
        await client.query(
          `
          SELECT
            *,
            fecha::text AS fecha,
            (
              fecha + hora_inicio
            ) > (
              CURRENT_TIMESTAMP
              AT TIME ZONE 'America/Bogota'
            ) AS futura
          FROM citas
          WHERE id = $1
          FOR UPDATE
          `,
          [id]
        );

      const cita =
        citaResult.rows[0];

      if (
        !cita ||
        !cita.futura ||
        ![
          "PROGRAMADA",
          "CONFIRMADA"
        ].includes(cita.estado)
      ) {
        throw fallo(
          "Solo se pueden reprogramar citas pendientes que aún no han iniciado"
        );
      }

      if (
        cita.fecha === fecha &&
        cita.hora_inicio.slice(0, 5) ===
          horaInicio
      ) {
        throw fallo(
          "Selecciona un horario diferente al actual"
        );
      }

      const paciente =
        await client.query(
          `
          SELECT id
          FROM pacientes
          WHERE id = $1
            AND estado = 'ACTIVO'
          FOR SHARE
          `,
          [cita.paciente_id]
        );

      if (!paciente.rows.length) {
        throw fallo(
          "El paciente no está disponible"
        );
      }

      const disponibilidadService =
        new DisponibilidadService({
          disponibilidadRepository:
            new DisponibilidadRepository(client),

          citaRepository:
            new CitaRepository(client)
        });

      const franjas =
        await disponibilidadService
          .obtenerFranjasDisponibles({
            medicoId: cita.medico_id,
            fecha,
            excluirCitaId: id
          });

      const franja =
        franjas.find(
          (item) =>
            item.horaInicio === horaInicio
        );

      if (!franja) {
        throw fallo(
          "El nuevo horario no está disponible. Consulta las franjas nuevamente."
        );
      }

      const result =
        await client.query(
          `
          UPDATE citas
          SET
            fecha = $2,
            hora_inicio = $3,
            hora_fin = $4,
            estado = 'PROGRAMADA',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
          `,
          [
            id,
            fecha,
            horaInicio,
            franja.horaFin
          ]
        );

      await this.auditar(
        client,
        id,
        actor,
        "CITA_REPROGRAMADA",
        {
          anterior: {
            fecha: cita.fecha,
            horaInicio:
              cita.hora_inicio
          },
          nuevo: {
            fecha,
            horaInicio
          }
        }
      );

      await client.query("COMMIT");

      return result.rows[0];

    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        throw fallo(
          "El nuevo horario ya está reservado"
        );
      }

      throw error;

    } finally {
      client.release();
    }
  }
}