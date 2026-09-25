CREATE TABLE IF NOT EXISTS historias_clinicas (
    id BIGSERIAL PRIMARY KEY,

    paciente_id BIGINT NOT NULL UNIQUE,

    activa BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historia_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS controles_medicos (
    id BIGSERIAL PRIMARY KEY,

    historia_clinica_id BIGINT NOT NULL,

    cita_id BIGINT NOT NULL,

    medico_id BIGINT NOT NULL,

    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    motivo_consulta TEXT NOT NULL,

    observaciones TEXT NOT NULL,

    diagnostico TEXT,

    tratamiento TEXT,

    recomendaciones TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_control_historia
        FOREIGN KEY (historia_clinica_id)
        REFERENCES historias_clinicas(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_control_cita
        FOREIGN KEY (cita_id)
        REFERENCES citas(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_control_medico
        FOREIGN KEY (medico_id)
        REFERENCES medicos(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS
idx_historia_paciente
ON historias_clinicas(paciente_id);

CREATE INDEX IF NOT EXISTS
idx_controles_historia
ON controles_medicos(historia_clinica_id);

CREATE INDEX IF NOT EXISTS
idx_controles_cita
ON controles_medicos(cita_id);

CREATE INDEX IF NOT EXISTS
idx_controles_medico
ON controles_medicos(medico_id);