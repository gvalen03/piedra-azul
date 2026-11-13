-- Ejecutar después de 010. Los datos personales ya viven en personas y los
-- permisos viven en Keycloak; estas columnas son duplicados del modelo viejo.
BEGIN;

ALTER TABLE adjuntos_control RENAME COLUMN control_medico_id TO control_clinico_id;

ALTER TABLE profesionales
  DROP COLUMN IF EXISTS nombre,
  DROP COLUMN IF EXISTS apellido,
  DROP COLUMN IF EXISTS numero_documento,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS telefono;

ALTER TABLE usuarios
  DROP COLUMN IF EXISTS medico_id,
  DROP COLUMN IF EXISTS paciente_id,
  DROP COLUMN IF EXISTS nombre,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS rol,
  DROP COLUMN IF EXISTS password;

COMMIT;
