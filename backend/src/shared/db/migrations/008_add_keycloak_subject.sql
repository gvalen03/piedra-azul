ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS keycloak_subject VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_usuarios_keycloak_subject
ON usuarios (keycloak_subject)
WHERE keycloak_subject IS NOT NULL;
