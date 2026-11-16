-- Ejecutar UNA SOLA VEZ únicamente sobre la base anterior (la que tiene
-- medicos, controles_medicos y medico_id). Conserva los IDs existentes.
BEGIN;

ALTER TABLE medicos RENAME TO profesionales;
ALTER TABLE profesionales ADD COLUMN persona_id BIGINT;

INSERT INTO personas (nombre, apellido, numero_documento, email, telefono, created_at, updated_at)
SELECT nombre, apellido, numero_documento, email, telefono, created_at, updated_at
FROM profesionales;

UPDATE profesionales pr SET persona_id=pe.id
FROM personas pe WHERE pe.numero_documento=pr.numero_documento;
ALTER TABLE profesionales ALTER COLUMN persona_id SET NOT NULL;
ALTER TABLE profesionales ADD CONSTRAINT uq_profesionales_persona UNIQUE (persona_id);
ALTER TABLE profesionales ADD CONSTRAINT fk_profesionales_persona FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE RESTRICT;
ALTER TABLE profesionales ADD COLUMN tipo_profesional VARCHAR(20) NOT NULL DEFAULT 'MEDICO';

ALTER TABLE pacientes ADD COLUMN persona_id BIGINT;
INSERT INTO personas (nombre, apellido, numero_documento, email, telefono, fecha_nacimiento, direccion, genero, created_at, updated_at)
SELECT nombre, apellido, numero_documento, email, telefono, fecha_nacimiento, direccion, genero, created_at, updated_at
FROM pacientes;
UPDATE pacientes pa SET persona_id=pe.id FROM personas pe WHERE pe.numero_documento=pa.numero_documento;
ALTER TABLE pacientes ALTER COLUMN persona_id SET NOT NULL;
ALTER TABLE pacientes ADD CONSTRAINT uq_pacientes_persona UNIQUE (persona_id);
ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_persona FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE RESTRICT;

ALTER TABLE usuarios ADD COLUMN persona_id BIGINT;
UPDATE usuarios u SET persona_id=pr.persona_id FROM profesionales pr WHERE pr.id=u.medico_id;
UPDATE usuarios u SET persona_id=pa.persona_id FROM pacientes pa WHERE pa.id=u.paciente_id;
INSERT INTO personas (nombre, apellido, numero_documento, email)
SELECT u.nombre, 'Sin apellido', 'CUENTA-' || u.username, u.email
FROM usuarios u WHERE u.persona_id IS NULL;
UPDATE usuarios u SET persona_id=pe.id FROM personas pe WHERE pe.numero_documento='CUENTA-' || u.username AND u.persona_id IS NULL;
ALTER TABLE usuarios ALTER COLUMN persona_id SET NOT NULL;
ALTER TABLE usuarios ADD CONSTRAINT uq_usuarios_persona UNIQUE (persona_id);
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_persona FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE RESTRICT;

ALTER TABLE disponibilidades RENAME COLUMN medico_id TO profesional_id;
ALTER TABLE citas RENAME COLUMN medico_id TO profesional_id;
ALTER TABLE controles_medicos RENAME TO controles_clinicos;
ALTER TABLE controles_clinicos RENAME COLUMN medico_id TO profesional_id;
ALTER TABLE controles_clinicos ADD COLUMN paciente_id BIGINT;
UPDATE controles_clinicos cc SET paciente_id=c.paciente_id FROM citas c WHERE c.id=cc.cita_id;
ALTER TABLE controles_clinicos ALTER COLUMN paciente_id SET NOT NULL;

-- Las columnas históricas duplicadas se conservan durante esta transición;
-- la aplicación ya lee y escribe exclusivamente el modelo normalizado.
COMMIT;
