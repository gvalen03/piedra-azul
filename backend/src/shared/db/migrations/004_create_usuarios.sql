
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,

    persona_id BIGINT NOT NULL UNIQUE,

    username VARCHAR(100) NOT NULL UNIQUE,

    keycloak_subject VARCHAR(255) NOT NULL UNIQUE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE RESTRICT
);

-- Facilitar consultas de cuentas activas.
CREATE INDEX IF NOT EXISTS
idx_usuarios_activo
ON usuarios(activo);
