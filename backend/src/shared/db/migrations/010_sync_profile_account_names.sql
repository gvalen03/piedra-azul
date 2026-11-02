-- Una sola fuente de nombre para cuentas con perfil clínico.
-- Aplicar únicamente en el ambiente autorizado, después de la migración 009.

UPDATE usuarios u
SET nombre = CONCAT_WS(' ', m.nombre, m.apellido),
    updated_at = GREATEST(CURRENT_TIMESTAMP, u.updated_at + INTERVAL '1 millisecond')
FROM medicos m
WHERE u.medico_id = m.id
  AND u.nombre IS DISTINCT FROM CONCAT_WS(' ', m.nombre, m.apellido);

UPDATE usuarios u
SET nombre = CONCAT_WS(' ', p.nombre, p.apellido),
    updated_at = GREATEST(CURRENT_TIMESTAMP, u.updated_at + INTERVAL '1 millisecond')
FROM pacientes p
WHERE u.paciente_id = p.id
  AND u.nombre IS DISTINCT FROM CONCAT_WS(' ', p.nombre, p.apellido);
