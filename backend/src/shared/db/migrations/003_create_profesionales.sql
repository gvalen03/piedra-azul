
CREATE TABLE IF NOT EXISTS profesionales (
    id BIGSERIAL PRIMARY KEY,

    persona_id BIGINT NOT NULL UNIQUE,

    tipo_profesional VARCHAR(20) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_profesional_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_profesional_tipo
        CHECK (
            tipo_profesional IN (
                'MEDICO',
                'TERAPISTA'
            )
        )
);
