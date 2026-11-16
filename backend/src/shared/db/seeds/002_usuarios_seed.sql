BEGIN;

INSERT INTO personas (
    nombre, apellido, numero_documento,
    email, telefono, fecha_nacimiento,
    direccion, genero
)
VALUES
    ('Administrador', 'Uno', '90000001',
     'admin1@piedraazul.test',
     NULL, NULL, NULL, NULL),

    ('Agendador', 'Uno', '90000002',
     'agendador1@piedraazul.test',
     NULL, NULL, NULL, NULL),

    ('Ana', 'Pérez', '20000001',
     'ana.perez@piedraazul.test',
     '3100000001', '1995-04-12',
     'Cra 10 # 12-34', 'MUJER'),

    ('Diego', 'Torres', '20000002',
     'diego.torres@piedraazul.test',
     '3100000002', '1988-09-25',
     'Calle 15 # 20-10', 'HOMBRE');

-- Crear perfiles de paciente.
INSERT INTO pacientes (
    persona_id, eps, estado
)
SELECT
    p.id,
    CASE p.numero_documento
        WHEN '20000001' THEN 'EPS Sanitas'
        WHEN '20000002' THEN 'EPS Compensar'
    END,
    'ACTIVO'
FROM personas p
WHERE p.numero_documento IN (
    '20000001', '20000002'
);

-- Crear cuentas de acceso locales.
-- Los roles se administrarán desde Keycloak.
INSERT INTO usuarios (
    persona_id, username,
    keycloak_subject, activo
)
SELECT
    p.id,
    CASE p.numero_documento
        WHEN '90000001' THEN 'admin1'
        WHEN '90000002' THEN 'agendador1'
        WHEN '10000001' THEN 'medico1'
        WHEN '20000001' THEN 'paciente1'
    END,
    NULL,
    TRUE
FROM personas p
WHERE p.numero_documento IN (
    '90000001',
    '90000002',
    '10000001',
    '20000001'
);

COMMIT;