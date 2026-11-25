ALTER TABLE citas
  DROP CONSTRAINT IF EXISTS chk_cita_estado;

ALTER TABLE citas
  ADD CONSTRAINT chk_cita_estado
  CHECK (estado IN (
    'PROGRAMADA',
    'CONFIRMADA',
    'ATENDIDA',
    'CANCELADA',
    'INASISTENCIA'
  ));
