CREATE TABLE IF NOT EXISTS pacientes (
    id BIGSERIAL PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,

    numero_documento VARCHAR(50) NOT NULL UNIQUE,

    fecha_nacimiento DATE NOT NULL,

    email VARCHAR(150) UNIQUE,

    telefono VARCHAR(50) NOT NULL,

    direccion VARCHAR(255),

    eps VARCHAR(150),

    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',

    genero VARCHAR(20) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_paciente_estado
        CHECK (
            estado IN (
                'ACTIVO',
                'INACTIVO'
            )
        ),

    CONSTRAINT chk_paciente_genero
        CHECK (
            genero IN (
                'HOMBRE',
                'MUJER',
                'OTRO'
            )
        )
);

CREATE INDEX IF NOT EXISTS
idx_pacientes_numero_documento
ON pacientes(numero_documento);

CREATE INDEX IF NOT EXISTS
idx_pacientes_estado
ON pacientes(estado);