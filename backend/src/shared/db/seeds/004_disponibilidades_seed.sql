BEGIN;

TRUNCATE TABLE disponibilidades RESTART IDENTITY CASCADE;

INSERT INTO disponibilidades (
  medico_id,
  dia_semana,
  hora_inicio,
  hora_fin,
  intervalo_minutos,
  semanas_habilitadas,
  activo,
  created_at,
  updated_at
)
VALUES
  (1, 'LUNES', '09:00:00', '13:00:00', 30, 4, TRUE, NOW(), NOW()),
  (1, 'MIERCOLES', '09:00:00', '13:00:00', 30, 4, TRUE, NOW(), NOW()),
  (1, 'VIERNES', '15:00:00', '19:00:00', 30, 4, TRUE, NOW(), NOW()),
  (2, 'MARTES', '10:00:00', '14:00:00', 30, 4, TRUE, NOW(), NOW()),
  (2, 'JUEVES', '10:00:00', '14:00:00', 30, 4, TRUE, NOW(), NOW());

COMMIT;

-- Credenciales de prueba:
-- medico 1 y 2 ya tienen agenda disponible para agendar citas.
