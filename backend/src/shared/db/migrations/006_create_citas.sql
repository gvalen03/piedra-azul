
-- Requerida para las restricciones de solapamiento.
-- Ya debe existir desde la migración de disponibilidades.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS citas (
    id BIGSERIAL PRIMARY KEY,

    paciente_id BIGINT NOT NULL,
    profesional_id BIGINT NOT NULL,

    CONSTRAINT uq_cita_paciente_profesional
        UNIQUE (id, paciente_id, profesional_id),

    fecha DATE NOT NULL,

    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,

    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',

    motivo TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cita_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cita_profesional
        FOREIGN KEY (profesional_id)
        REFERENCES profesionales(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cita_horario
        CHECK (hora_inicio < hora_fin),

    CONSTRAINT chk_cita_estado
        CHECK (
            estado IN (
                'PROGRAMADA',
                'CONFIRMADA',
                'ATENDIDA',
                'CANCELADA'
            )
        ),

    -- Un profesional no puede tener citas activas superpuestas.
    CONSTRAINT ex_cita_profesional_solapamiento
        EXCLUDE USING gist (
            profesional_id WITH =,
            tsrange(
                fecha + hora_inicio,
                fecha + hora_fin,
                '[)'
            ) WITH &&
        )
        WHERE (estado <> 'CANCELADA'),

    -- Un paciente no puede tener citas activas superpuestas.
    CONSTRAINT ex_cita_paciente_solapamiento
        EXCLUDE USING gist (
            paciente_id WITH =,
            tsrange(
                fecha + hora_inicio,
                fecha + hora_fin,
                '[)'
            ) WITH &&
        )
        WHERE (estado <> 'CANCELADA')
);

-- Consultar la agenda de un profesional.
CREATE INDEX IF NOT EXISTS
idx_citas_profesional_fecha
ON citas(profesional_id, fecha);

-- Consultar las citas de un paciente.
CREATE INDEX IF NOT EXISTS
idx_citas_paciente_fecha
ON citas(paciente_id, fecha);

-- Consultar citas por estado.
CREATE INDEX IF NOT EXISTS
idx_citas_estado
ON citas(estado);
