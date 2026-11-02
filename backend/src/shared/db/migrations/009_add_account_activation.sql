-- Esta migración agrega soporte para activación de cuentas sin almacenar
-- contraseñas temporales conocidas por personal administrativo.
-- Revísela y aplíquela únicamente en el ambiente autorizado.

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_medico_unico
ON usuarios (medico_id)
WHERE medico_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_paciente_unico
ON usuarios (paciente_id)
WHERE paciente_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS activaciones_cuenta (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expira_en TIMESTAMP NOT NULL,
    usado_en TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activaciones_cuenta_usuario
ON activaciones_cuenta (usuario_id)
WHERE usado_en IS NULL;
