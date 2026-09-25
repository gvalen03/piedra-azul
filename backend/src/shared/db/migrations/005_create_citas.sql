CREATE TABLE IF NOT EXISTS citas (
    id BIGSERIAL PRIMARY KEY,

    paciente_id BIGINT NOT NULL,

    medico_id BIGINT NOT NULL,

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

    CONSTRAINT fk_cita_medico
        FOREIGN KEY (medico_id)
        REFERENCES medicos(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cita_horario
        CHECK (
            hora_inicio < hora_fin
        ),

    CONSTRAINT chk_cita_estado
        CHECK (
            estado IN (
                'PROGRAMADA',
                'CONFIRMADA',
                'ATENDIDA',
                'CANCELADA'
            )
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS
uq_cita_medico_fecha_hora
ON citas (
    medico_id,
    fecha,
    hora_inicio
)
WHERE estado <> 'CANCELADA';

CREATE INDEX IF NOT EXISTS
idx_citas_medico_fecha
ON citas(medico_id, fecha);

CREATE INDEX IF NOT EXISTS
idx_citas_paciente
ON citas(paciente_id);

CREATE INDEX IF NOT EXISTS
idx_citas_estado
ON citas(estado);