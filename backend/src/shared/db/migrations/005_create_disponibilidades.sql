
-- Necesaria para la restricción de solapamiento.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS disponibilidades (
    id BIGSERIAL PRIMARY KEY,

    profesional_id BIGINT NOT NULL,

    dia_semana VARCHAR(20) NOT NULL,

    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,

    intervalo_minutos INTEGER NOT NULL,

    semanas_habilitadas INTEGER NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_disponibilidad_profesional
        FOREIGN KEY (profesional_id)
        REFERENCES profesionales(id)
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
        CHECK (hora_inicio < hora_fin),

    CONSTRAINT chk_disponibilidad_intervalo
        CHECK (intervalo_minutos > 0),

    CONSTRAINT chk_disponibilidad_semanas
        CHECK (semanas_habilitadas > 0),

    CONSTRAINT ex_disponibilidad_solapamiento
        EXCLUDE USING gist (
            profesional_id WITH =,
            dia_semana WITH =,
            tsrange(
                DATE '2000-01-01' + hora_inicio,
                DATE '2000-01-01' + hora_fin,
                '[)'
            ) WITH &&
        )
        WHERE (activo = TRUE)
);

CREATE INDEX IF NOT EXISTS
idx_disponibilidades_profesional_dia
ON disponibilidades(profesional_id, dia_semana);
