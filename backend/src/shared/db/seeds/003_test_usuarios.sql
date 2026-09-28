BEGIN;

TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE;
TRUNCATE TABLE pacientes RESTART IDENTITY CASCADE;

INSERT INTO pacientes (id, nombre, apellido, numero_documento, fecha_nacimiento, email, telefono, direccion, eps, estado, genero, created_at, updated_at)
VALUES
  (1, 'Ana', 'Pérez', '20000001', '1995-04-12', 'ana.perez@piedraazul.test', '3100000001', 'Cra 10 # 12-34', 'EPS Sanitas', 'ACTIVO', 'MUJER', NOW(), NOW()),
  (2, 'Diego', 'Torres', '20000002', '1988-09-25', 'diego.torres@piedraazul.test', '3100000002', 'Calle 15 # 20-10', 'EPS Compensar', 'ACTIVO', 'HOMBRE', NOW(), NOW());

INSERT INTO usuarios (id, username, password, nombre, email, rol, activo, medico_id, paciente_id, created_at, updated_at)
VALUES
  (1, 'admin1', '$2b$12$AZM02yHSHqxD0JIFz6vf8eL5w9ndCBLRdck5fva7t/4FHdCkKhu.C', 'Administrador Uno', 'admin1@piedraazul.test', 'ADMINISTRADOR', TRUE, NULL, NULL, NOW(), NOW()),
  (2, 'agendador1', '$2b$12$AZM02yHSHqxD0JIFz6vf8eL5w9ndCBLRdck5fva7t/4FHdCkKhu.C', 'Agendador Uno', 'agendador1@piedraazul.test', 'AGENDADOR', TRUE, NULL, NULL, NOW(), NOW()),
  (3, 'paciente1', '$2b$12$AZM02yHSHqxD0JIFz6vf8eL5w9ndCBLRdck5fva7t/4FHdCkKhu.C', 'Ana Pérez', 'ana.perez@piedraazul.test', 'PACIENTE', TRUE, NULL, 1, NOW(), NOW());

COMMIT;

-- usuarios de prueba disponibles:
-- admin1 / 123456
-- agendador1 / 123456
-- paciente1 / 123456
