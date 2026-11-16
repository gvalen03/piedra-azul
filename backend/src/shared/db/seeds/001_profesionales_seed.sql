BEGIN;

INSERT INTO personas (
    nombre, apellido, numero_documento,
    email, telefono
)
VALUES
    ('Laura', 'García', '10000001',
     'laura.garcia@piedraazul.test', '3001112233'),

    ('Mateo', 'Ruiz', '10000002',
     'mateo.ruiz@piedraazul.test', '3002223344'),

    ('Sofía', 'López', '10000003',
     'sofia.lopez@piedraazul.test', '3003334455');

-- Perfiles profesionales asociados a las personas.
INSERT INTO profesionales (
    persona_id, tipo_profesional, activo
)
SELECT
    p.id,
    CASE
        WHEN p.numero_documento = '10000003'
            THEN 'TERAPISTA'
        ELSE 'MEDICO'
    END,
    TRUE
FROM personas p
WHERE p.numero_documento IN (
    '10000001',
    '10000002',
    '10000003'
);

COMMIT;