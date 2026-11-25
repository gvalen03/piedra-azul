ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS justificacion_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS cancelada_at TIMESTAMP;
