CREATE TABLE IF NOT EXISTS disponibilidades (
    id BIGSERIAL PRIMARY KEY,

    medico_id BIGINT NOT NULL,

    dia_semana VARCHAR(20) NOT NULL,

    hora_inicio TIME NOT NULL,

    hora_fin TIME NOT NULL,

    intervalo_minutos INTEGER NOT NULL,

    semanas_habilitadas INTEGER NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_disponibilidad_medico
        FOREIGN KEY (medico_id)
        REFERENCES medicos(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_disponibilidad_dia
        CHECK (
            dia_semana IN (
                'LUNES',
                'MARTES',
                'MIERCOLES',
                'JUEVES',
                'VIERNES',
                'SABADO',
                'DOMINGO'
            )
        ),

    CONSTRAINT chk_disponibilidad_horario
        CHECK (
            hora_inicio < hora_fin
        ),

    CONSTRAINT chk_disponibilidad_intervalo
        CHECK (
            intervalo_minutos > 0
        ),

    CONSTRAINT chk_disponibilidad_semanas
        CHECK (
            semanas_habilitadas > 0
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS
uq_disponibilidad_medico_dia_horario
ON disponibilidades (
    medico_id,
    dia_semana,
    hora_inicio,
    hora_fin
);

CREATE INDEX IF NOT EXISTS
idx_disponibilidades_medico
ON disponibilidades(medico_id);

CREATE INDEX IF NOT EXISTS
idx_disponibilidades_medico_dia
ON disponibilidades(medico_id, dia_semana);