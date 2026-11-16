# Piedra Azul

Proyecto full stack desarrollado con:

- Frontend: SolidJS + Vite
- Backend: Fastify
- Base de datos: PostgreSQL

## 1. Requisitos previos

Cada integrante debe tener instalado:

- Git
- Node.js
- npm
- PostgreSQL
- Docker Desktop
- WSL

Verificar con:

```bash
git --version
node -v
npm -v
psql --version
```

## Base de datos refactorizada

En una base nueva, ejecuta en orden los archivos de `backend/src/shared/db/migrations/001` a `012` y después los seeds si necesitas datos de prueba. Keycloak mantiene los roles; la base solo vincula el `keycloak_subject` con una persona local activa.

## Keycloak local

La integración valida access tokens firmados con `RS256` usando el JWKS del issuer configurado; exige `iss`, `aud`, `azp`, `sub`, `iat` y `exp`, verifica `nbf` si aparece y comprueba que `azp` corresponde al client ID configurado. El backend toma el único rol de aplicación aceptado directamente de `realm_access.roles`; Keycloak es la única fuente de autoridad de roles. El claim `sub` se vincula explícitamente a una cuenta local mediante `usuarios.keycloak_subject`.

### Iniciar el realm local

Requiere Docker Compose y una contraseña de desarrollo que no se guarde en el repositorio. En PowerShell:

```powershell
$env:KEYCLOAK_ADMIN_PASSWORD = Read-Host "Contraseña temporal del administrador local de Keycloak"
docker compose -f backend/compose.keycloak.yml up -d
Remove-Item Env:KEYCLOAK_ADMIN_PASSWORD
```

La configuración importa el realm `piedra-azul` en `http://localhost:8081` con los cuatro roles de aplicación, el cliente público `piedra-azul-api` (Authorization Code + PKCE y sin password grant) y el cliente de servicio `piedra-azul-provisioner`. `start-dev` y el administrador de bootstrap son solo para desarrollo local; no los uses como despliegue productivo.

La definición del cliente incluye mappers directos en su scope dedicado para asegurar que los access tokens contengan `sub` y `realm_access.roles`, incluso si el realm no tiene scopes built-in disponibles. Si el realm ya está importado, abre **Clients > piedra-azul-api > Client scopes > piedra-azul-api-dedicated** y, en la pestaña **Mappers**, crea los mappers `Subject (sub)` y `User Realm Role`. En ambos habilita **Add to access token**; para `User Realm Role`, usa como **Token Claim Name** `realm_access.roles` y marca **Multivalued**. No hace falta borrar ni reimportar el realm.

El cliente de servicio no lleva un secreto exportado ni permisos de administración predeterminados. En la consola de Keycloak local, abre `Clients > piedra-azul-provisioner > Service account roles`, selecciona el cliente `realm-management` y asigna solo `manage-users`, `query-users` y `view-realm`. En `Credentials`, copia el secreto generado solamente a `KEYCLOAK_PROVISIONER_CLIENT_SECRET` del entorno del backend y configura `KEYCLOAK_PROVISIONER_CLIENT_ID=piedra-azul-provisioner`. Nunca lleves este secreto al frontend ni lo exportes en Postman.

### Aprovisionar cuentas desde Piedra Azul

Un administrador autenticado puede crear una cuenta desde **Accesos Keycloak** en el frontend, o mediante `POST /api/admin/usuarios`. El backend valida duplicados, reserva una operación local, crea o reutiliza la cuenta en Keycloak, asigna exactamente un rol de aplicación y guarda su `sub` en `usuarios.keycloak_subject` dentro de una transacción. Para pacientes y profesionales puede vincular un perfil existente o crearlo en la misma operación.

Si PostgreSQL falla, el backend elimina únicamente la cuenta que esa operación acaba de crear en Keycloak. Las cuentas preexistentes nunca se eliminan; su operación queda marcada como `REQUIERE_RECUPERACION` en `aprovisionamientos_usuarios` para revisión. La columna `keycloak_subject` y el username tienen restricciones únicas. Una cuenta sin vínculo, inactiva o sin el perfil requerido no puede iniciar sesión.

### Configurar backend y frontend

Usa `backend/.env.example` y `frontend/.env.example` como referencia y configura localmente:

```dotenv
AUTH_PROVIDER=keycloak
KEYCLOAK_ISSUER=http://localhost:8081/realms/piedra-azul
KEYCLOAK_AUDIENCE=piedra-azul-api
KEYCLOAK_CLIENT_ID=piedra-azul-api
KEYCLOAK_JWKS_URI=http://localhost:8081/realms/piedra-azul/protocol/openid-connect/certs
KEYCLOAK_PROVISIONER_CLIENT_ID=piedra-azul-provisioner
KEYCLOAK_PROVISIONER_CLIENT_SECRET=<secreto-local-del-cliente-confidencial>
```

En `frontend/.env`, selecciona `VITE_AUTH_PROVIDER=keycloak`, `VITE_KEYCLOAK_URL=http://localhost:8081`, `VITE_KEYCLOAK_REALM=piedra-azul` y `VITE_KEYCLOAK_CLIENT_ID=piedra-azul-api`. Reinicia Vite tras cambiar variables. El inicio de sesión web usa Authorization Code con PKCE; el modo local conserva el login anterior solo para desarrollo. En producción el backend rechaza `AUTH_PROVIDER=local` y requiere configuración Keycloak con HTTPS.

### Recorrido Postman reproducible

1. Inicia Keycloak y la API configurada con `AUTH_PROVIDER=keycloak`.
2. En Postman, desde **Authorization > OAuth 2.0 > Get New Access Token**, elige `Authorization Code (With PKCE)`: authorize URL `http://localhost:8081/realms/piedra-azul/protocol/openid-connect/auth`, token URL `http://localhost:8081/realms/piedra-azul/protocol/openid-connect/token`, client ID `piedra-azul-api`, client secret vacío, scope `openid` y callback `https://oauth.pstmn.io/v1/callback`. Pega el access token solo en la variable local secreta `userAccessToken`.
3. Usa el token de servicio para crear un usuario sintético y asignarle exactamente un rol; para autenticarlo, establece una contraseña temporal solo en el entorno Postman local. Repite el flujo para cada rol de aplicación.
4. Antes de probar, crea una fila local activa por usuario. Para `MEDICO_TERAPISTA` y `PACIENTE`, vincula además un perfil activo. Asigna los roles únicamente en Keycloak y vincula cada `sub` con su fila local usando el SQL anterior.
5. Obtén un access token de cada usuario con Authorization Code + PKCE en Postman y guárdalo localmente en `adminAccessToken`, `agendadorAccessToken`, `medicoAccessToken` y `pacienteAccessToken`. Configura también `smokeMedicoId` y `smokeFecha`, ejecuta los requests de `03 - AUTH-02 role authorization matrix` y exige todos sus resultados `200`, `403` y `401` esperados.
6. La matriz automatizada comprueba el acceso permitido de cada rol y que los otros tres roles no accedan a rutas de administración; las pruebas backend cubren el cruce completo de cada rol contra cada rol requerido, el mapeo de claims y el caso sin JWT. Limpia secretos, contraseñas y tokens después de la prueba; no exportes el entorno rellenado.

El entorno Postman versionado mantiene vacíos los secretos, las contraseñas, los tokens y los IDs generados.
