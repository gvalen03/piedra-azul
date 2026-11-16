
CREATE TABLE IF NOT EXISTS personas (
    id BIGSERIAL PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,

    numero_documento VARCHAR(50) NOT NULL UNIQUE,

    email VARCHAR(150),
    telefono VARCHAR(50),

    fecha_nacimiento DATE,
    direccion VARCHAR(255),
    genero VARCHAR(20),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_persona_genero
        CHECK (
            genero IN (
                'HOMBRE',
                'MUJER',
                'OTRO'
            )
        )
);

-- Evitar correos duplicados sin distinguir mayúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS
uq_personas_email_normalizado
ON personas (LOWER(email))
WHERE email IS NOT NULL;
