# Activación segura de cuentas

## Antes de usarla

1. Haz respaldo y aplica, en orden, `backend/src/shared/db/migrations/009_add_account_activation.sql`, `backend/src/shared/db/migrations/010_sync_profile_account_names.sql` y `backend/src/shared/db/migrations/011_require_account_for_active_medicos.sql` únicamente en el ambiente autorizado.
2. No ejecutes esa migración automáticamente desde la aplicación ni borres datos existentes.
3. Mantén las variables y el flujo de Keycloak configurados como están. La cuenta local conserva el rol y el vínculo con el perfil; con `AUTH_PROVIDER=keycloak`, el usuario también debe estar aprovisionado y vinculado con su `keycloak_subject` por el procedimiento de Keycloak del equipo.

## Flujos disponibles

- Al crear un médico, terapista o paciente desde Administración, el administrador define el usuario y la contraseña inicial. Se crea una cuenta activa y vinculada con rol `MEDICO_TERAPISTA` o `PACIENTE`.
- El titular autenticado puede cambiar su contraseña desde su portal, indicando la contraseña actual. El administrador también puede restablecerla al editar la cuenta en Administración.
- Al crear un `AGENDADOR`, `MEDICO_TERAPISTA` o `PACIENTE` sin contraseña, el sistema crea una cuenta inactiva y devuelve una sola vez `activationToken`. El administrador debe entregarlo al titular por un canal privado; no debe ponerlo en URLs, commits, tickets ni registros.
- Un paciente puede registrarse directamente con `POST /api/pacientes/registro`. En este caso él mismo establece su contraseña y su cuenta `PACIENTE` queda vinculada al perfil en la misma transacción.
- Para activar una cuenta pendiente, el titular hace `POST /api/auth/activate` con el token y una contraseña nueva. El token se guarda solo como SHA-256, vence a las 24 horas y no se puede reutilizar.

Ejemplo de activación (el token debe enviarse en el cuerpo, nunca en la URL):

```json
{
  "token": "codigo-entregado-por-canal-seguro",
  "password": "una-contraseña-de-al-menos-8-caracteres"
}
```

La respuesta correcta es `204 No Content`; no devuelve la contraseña, el token ni un JWT.

## Controles aplicados

- Bcrypt para toda contraseña persistida, incluidos valores aleatorios de cuentas pendientes.
- Restricciones únicas de perfil médico/paciente por cuenta en PostgreSQL.
- Perfil, cuenta, token y auditoría se guardan en una transacción; un error revierte la operación completa.
- La activación bloquea su registro, marca el token como usado y actualiza la contraseña y el estado de la cuenta de forma atómica.
- Las rutas administrativas siguen limitadas a `ADMINISTRADOR`; el registro autónomo no acepta roles del cliente.

## Verificación sugerida

Desde `backend`:

```bash
npm test
```

Además, en un entorno de prueba con PostgreSQL y Keycloak autorizado, verifica: creación de cada rol, duplicados de usuario/documento/correo, activación válida, token vencido o reutilizado, inicio de sesión antes y después de activar, y que una cuenta o perfil inactivo no pueda acceder.
