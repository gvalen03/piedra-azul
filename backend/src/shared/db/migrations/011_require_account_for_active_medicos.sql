-- Evita que una transacción confirme médicos activos sin una cuenta médica vinculada.
-- Es diferida: el perfil y la cuenta pueden crearse en cualquier orden dentro de
-- la misma transacción, pero ambos deben existir al hacer COMMIT.

CREATE OR REPLACE FUNCTION verificar_medico_activo_con_cuenta()
RETURNS TRIGGER AS $$
DECLARE
  perfil_id BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'medicos' THEN
    perfil_id := COALESCE(NEW.id, OLD.id);
  ELSE
    perfil_id := COALESCE(NEW.medico_id, OLD.medico_id);
  END IF;
  IF perfil_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM medicos WHERE id=perfil_id AND activo=TRUE)
     AND NOT EXISTS (
       SELECT 1 FROM usuarios
       WHERE medico_id=perfil_id AND rol='MEDICO_TERAPISTA'
     ) THEN
    RAISE EXCEPTION 'Un médico activo debe tener una cuenta MEDICO_TERAPISTA vinculada';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medico_activo_con_cuenta_en_medicos ON medicos;
CREATE CONSTRAINT TRIGGER trg_medico_activo_con_cuenta_en_medicos
AFTER INSERT OR UPDATE OF activo ON medicos
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION verificar_medico_activo_con_cuenta();

DROP TRIGGER IF EXISTS trg_medico_activo_con_cuenta_en_usuarios ON usuarios;
CREATE CONSTRAINT TRIGGER trg_medico_activo_con_cuenta_en_usuarios
AFTER UPDATE OF medico_id, rol OR DELETE ON usuarios
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION verificar_medico_activo_con_cuenta();
