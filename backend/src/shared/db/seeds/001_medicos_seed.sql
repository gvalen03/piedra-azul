BEGIN;

TRUNCATE TABLE medicos RESTART IDENTITY CASCADE;

INSERT INTO medicos (id, nombre, apellido, numero_documento, email, telefono, activo, created_at, updated_at)
VALUES
  (1, 'Laura', 'García', '10000001', 'laura.garcia@piedraazul.test', '3001112233', TRUE, NOW(), NOW()),
  (2, 'Mateo', 'Ruiz', '10000002', 'mateo.ruiz@piedraazul.test', '3002223344', TRUE, NOW(), NOW()),
  (3, 'Sofía', 'López', '10000003', 'sofia.lopez@piedraazul.test', '3003334455', TRUE, NOW(), NOW());

COMMIT;
