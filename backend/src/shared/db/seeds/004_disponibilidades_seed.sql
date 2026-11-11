BEGIN;

-- Disponibilidades de prueba para los profesionales.
INSERT INTO disponibilidades (
    profesional_id,
    dia_semana,
    hora_inicio,
    hora_fin,
    intervalo_minutos,
    semanas_habilitadas,
    activo
)
SELECT
    pr.id,
    horarios.dia_semana,
    horarios.hora_inicio::TIME,
    horarios.hora_fin::TIME,
    30,
    4,
    TRUE
FROM (
    VALUES
        ('10000001', 'LUNES',     '09:00', '13:00'),
        ('10000001', 'MIERCOLES', '09:00', '13:00'),
        ('10000001', 'VIERNES',   '15:00', '19:00'),
        ('10000002', 'MARTES',    '10:00', '14:00'),
        ('10000002', 'JUEVES',    '10:00', '14:00'),
        ('10000003', 'LUNES',     '14:00', '18:00'),
        ('10000003', 'JUEVES',    '08:00', '12:00')
) AS horarios(
    numero_documento,
    dia_semana,
    hora_inicio,
    hora_fin
)
JOIN personas p
    ON p.numero_documento = horarios.numero_documento
JOIN profesionales pr
    ON pr.persona_id = p.id;

COMMIT;