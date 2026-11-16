CREATE TABLE IF NOT EXISTS pacientes (
    id BIGSERIAL PRIMARY KEY,

    persona_id BIGINT NOT NULL UNIQUE,

    eps VARCHAR(150),

    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paciente_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_paciente_estado
        CHECK (estado IN ('ACTIVO', 'INACTIVO'))
);