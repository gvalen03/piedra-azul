BEGIN;

INSERT INTO usuarios (
    persona_id,
    username,
    keycloak_subject,
    activo
)
SELECT
    p.id,
    'paciente2',
    NULL,
    TRUE
FROM personas p
WHERE p.numero_documento = '20000002';

COMMIT;