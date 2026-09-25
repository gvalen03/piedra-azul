CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,

    username VARCHAR(100) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    nombre VARCHAR(150) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    rol VARCHAR(30) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    medico_id BIGINT,

    paciente_id BIGINT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_usuario_rol
        CHECK (
            rol IN (
                'ADMINISTRADOR',
                'MEDICO_TERAPISTA',
                'AGENDADOR',
                'PACIENTE'
            )
        ),

    CONSTRAINT fk_usuario_medico
        FOREIGN KEY (medico_id)
        REFERENCES medicos(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_usuario_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS
idx_usuarios_username
ON usuarios(username);

CREATE INDEX IF NOT EXISTS
idx_usuarios_rol
ON usuarios(rol);

CREATE INDEX IF NOT EXISTS
idx_usuarios_medico
ON usuarios(medico_id);

CREATE INDEX IF NOT EXISTS
idx_usuarios_paciente
ON usuarios(paciente_id);