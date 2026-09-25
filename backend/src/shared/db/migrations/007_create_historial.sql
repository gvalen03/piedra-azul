CREATE TABLE IF NOT EXISTS auditorias (
    id BIGSERIAL PRIMARY KEY,

    tipo_evento VARCHAR(100) NOT NULL,

    descripcion TEXT NOT NULL,

    entidad_id VARCHAR(100),

    realizado_por VARCHAR(150) NOT NULL,

    modulo_origen VARCHAR(100) NOT NULL,

    datos_adicionales JSONB,

    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS
idx_auditorias_tipo_evento
ON auditorias(tipo_evento);

CREATE INDEX IF NOT EXISTS
idx_auditorias_modulo
ON auditorias(modulo_origen);

CREATE INDEX IF NOT EXISTS
idx_auditorias_fecha
ON auditorias(fecha);

CREATE INDEX IF NOT EXISTS
idx_auditorias_usuario
ON auditorias(realizado_por);