CREATE TABLE IF NOT EXISTS medicos (
    id BIGSERIAL PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,

    numero_documento VARCHAR(50) NOT NULL UNIQUE,

    email VARCHAR(150) UNIQUE,

    telefono VARCHAR(50),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS
idx_medicos_numero_documento
ON medicos(numero_documento);

CREATE INDEX IF NOT EXISTS
idx_medicos_activo
ON medicos(activo);