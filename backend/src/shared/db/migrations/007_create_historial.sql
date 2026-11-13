
    -- =====================================================
    -- HISTORIAS CLINICAS
    -- =====================================================

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
            ON DELETE RESTRICT,

        -- Permite comprobar que una historia pertenece
        -- al paciente correspondiente desde otras tablas.
        CONSTRAINT uq_historia_id_paciente
            UNIQUE (id, paciente_id)
    );

    -- =====================================================
    -- CONTROLES CLINICOS
    -- =====================================================

    CREATE TABLE IF NOT EXISTS controles_clinicos (
        id BIGSERIAL PRIMARY KEY,

        historia_clinica_id BIGINT NOT NULL,

        cita_id BIGINT NOT NULL UNIQUE,

        profesional_id BIGINT NOT NULL,

        paciente_id BIGINT NOT NULL,

        fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        motivo_consulta TEXT NOT NULL,
        observaciones TEXT NOT NULL,

        diagnostico TEXT,
        tratamiento TEXT,
        recomendaciones TEXT,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_control_historia_paciente
            FOREIGN KEY (historia_clinica_id, paciente_id)
            REFERENCES historias_clinicas(id, paciente_id)
            ON DELETE RESTRICT,


        CONSTRAINT fk_control_cita_paciente_profesional
            FOREIGN KEY (
                cita_id,
                paciente_id,
                profesional_id
            )
            REFERENCES citas (
                id,
                paciente_id,
                profesional_id
            )
            ON DELETE RESTRICT,


        CONSTRAINT fk_control_profesional
            FOREIGN KEY (profesional_id)
            REFERENCES profesionales(id)
            ON DELETE RESTRICT
    );

    -- =====================================================
    -- ADJUNTOS DE CONTROLES
    -- =====================================================

    CREATE TABLE IF NOT EXISTS adjuntos_control (
        id BIGSERIAL PRIMARY KEY,

        control_clinico_id BIGINT NOT NULL,

        s3_key VARCHAR(500) NOT NULL UNIQUE,

        nombre_original VARCHAR(255) NOT NULL,

        tipo_mime VARCHAR(150) NOT NULL,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_adjunto_control
            FOREIGN KEY (control_clinico_id)
            REFERENCES controles_clinicos(id)
            ON DELETE RESTRICT
    );

    -- =====================================================
    -- INDICES
    -- =====================================================

    CREATE INDEX IF NOT EXISTS
    idx_controles_historia
    ON controles_clinicos(historia_clinica_id);

    CREATE INDEX IF NOT EXISTS
    idx_controles_profesional
    ON controles_clinicos(profesional_id);

    CREATE INDEX IF NOT EXISTS
    idx_adjuntos_control
    ON adjuntos_control(control_clinico_id);
