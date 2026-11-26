-- El perfil clínico determina si una cuenta vinculada de paciente o profesional
-- puede acceder al sistema. Esta reparación alinea registros creados antes de
-- que la sincronización transaccional fuera implementada.

UPDATE usuarios u
SET activo = pr.activo,
    updated_at = CURRENT_TIMESTAMP
FROM profesionales pr
WHERE pr.persona_id = u.persona_id
  AND u.activo IS DISTINCT FROM pr.activo;

UPDATE usuarios u
SET activo = (pa.estado = 'ACTIVO'),
    updated_at = CURRENT_TIMESTAMP
FROM pacientes pa
WHERE pa.persona_id = u.persona_id
  AND u.activo IS DISTINCT FROM (pa.estado = 'ACTIVO');
