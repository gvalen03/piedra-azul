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

Verificar con:

```bash
git --version
node -v
npm -v
psql --version
```

## Keycloak local (AUTH-01)

La integración valida access tokens firmados con `RS256` usando el JWKS del issuer configurado; exige `iss`, `aud`, `azp`, `sub`, `iat` y `exp`, verifica `nbf` si aparece y comprueba que `azp` corresponde al client ID configurado. El backend solo acepta un rol de aplicación de `realm_access.roles` y confirma que coincide con el rol del usuario local. El claim `sub` se vincula explícitamente al perfil local mediante `usuarios.keycloak_subject`.

### Iniciar el realm local

Requiere Docker Compose y una contraseña de desarrollo que no se guarde en el repositorio. En PowerShell:

```powershell
$env:KEYCLOAK_ADMIN_PASSWORD = Read-Host "Contraseña temporal del administrador local de Keycloak"
docker compose -f backend/compose.keycloak.yml up -d
Remove-Item Env:KEYCLOAK_ADMIN_PASSWORD
```

La configuración importa el realm `piedra-azul` en `http://localhost:8081` con los cuatro roles de aplicación, el cliente público `piedra-azul-api` (Authorization Code + PKCE y sin password grant) y el cliente de servicio `piedra-azul-provisioner`. `start-dev` y el administrador de bootstrap son solo para desarrollo local; no los uses como despliegue productivo.

La definición del cliente incluye mappers directos en su scope dedicado para asegurar que los access tokens contengan `sub` y `realm_access.roles`, incluso si el realm no tiene scopes built-in disponibles. Si el realm ya está importado, abre **Clients > piedra-azul-api > Client scopes > piedra-azul-api-dedicated** y, en la pestaña **Mappers**, crea los mappers `Subject (sub)` y `User Realm Role`. En ambos habilita **Add to access token**; para `User Realm Role`, usa como **Token Claim Name** `realm_access.roles` y marca **Multivalued**. No hace falta borrar ni reimportar el realm.

El cliente de servicio no lleva un secreto exportado ni permisos de administración predeterminados. En la consola de Keycloak local, abre `Clients > piedra-azul-provisioner > Service account roles`, selecciona el cliente `realm-management` y asigna solo `manage-users`, `query-users` y `view-realm`. En `Credentials`, copia el secreto generado solo a la variable secreta local de Postman. Importa `backend/keycloak/PiedraAzul-Keycloak-Admin.postman_collection.json` y `backend/keycloak/PiedraAzul-Keycloak.local.postman_environment.json`. La colección obtiene un token de servicio, crea un usuario sintético, le asigna un rol de realm y permite probar el endpoint de sesión. Nunca exportes el entorno con valores rellenados.

### Vincular un usuario local

Primero crea o verifica la cuenta y su rol/perfil local en la base de desarrollo usando el flujo administrativo existente en modo local. Después crea la cuenta Keycloak con el mismo username, asígnale exactamente uno de los roles `ADMINISTRADOR`, `AGENDADOR`, `MEDICO_TERAPISTA` o `PACIENTE` y aplica [la migración 008](backend/src/shared/db/migrations/008_add_keycloak_subject.sql) sobre una base de desarrollo. Obtén el ID/sub de la cuenta en Keycloak y vincúlalo explícitamente:

```sql
UPDATE usuarios
SET keycloak_subject = '<sub de Keycloak>'
WHERE username = '<username local>';
```

La columna tiene índice único; una cuenta sin vínculo, inactiva o con roles distintos no puede iniciar sesión. No uses la cuenta admin de Keycloak para invocar la API de Piedra Azul: crea usuarios con roles de aplicación y vincúlalos a perfiles locales. No ejecutes seeds que contengan `TRUNCATE ... CASCADE` sobre datos que quieras conservar.

### Configurar backend y frontend

Usa `backend/.env.example` y `frontend/.env.example` como referencia y configura localmente:

```dotenv
AUTH_PROVIDER=keycloak
KEYCLOAK_ISSUER=http://localhost:8081/realms/piedra-azul
KEYCLOAK_AUDIENCE=piedra-azul-api
KEYCLOAK_CLIENT_ID=piedra-azul-api
KEYCLOAK_JWKS_URI=http://localhost:8081/realms/piedra-azul/protocol/openid-connect/certs
```

En `frontend/.env`, selecciona `VITE_AUTH_PROVIDER=keycloak`, `VITE_KEYCLOAK_URL=http://localhost:8081`, `VITE_KEYCLOAK_REALM=piedra-azul` y `VITE_KEYCLOAK_CLIENT_ID=piedra-azul-api`. Reinicia Vite tras cambiar variables. El inicio de sesión web usa Authorization Code con PKCE; el modo local conserva el login anterior solo para desarrollo. En producción el backend rechaza `AUTH_PROVIDER=local` y requiere configuración Keycloak con HTTPS.

### Recorrido Postman reproducible

1. Inicia Keycloak y la API configurada con `AUTH_PROVIDER=keycloak`.
2. En Postman, desde **Authorization > OAuth 2.0 > Get New Access Token**, elige `Authorization Code (With PKCE)`: authorize URL `http://localhost:8081/realms/piedra-azul/protocol/openid-connect/auth`, token URL `http://localhost:8081/realms/piedra-azul/protocol/openid-connect/token`, client ID `piedra-azul-api`, client secret vacío, scope `openid` y callback `https://oauth.pstmn.io/v1/callback`. Pega el access token solo en la variable local secreta `userAccessToken`.
3. Usa el token de servicio para crear un usuario sintético y asignarle exactamente un rol; para autenticarlo, establece una contraseña temporal solo en el entorno Postman local.
4. Vincula el `sub` creado con su fila local mediante el SQL anterior; luego usa el token del usuario en `Validate Keycloak user session and local profile binding` y en una ruta que corresponda a su rol.
5. Comprueba que la solicitud sin JWT retorna `401`, un token con issuer/audience/firma/tiempos incorrectos retorna `401`, y el token válido con rol ajeno retorna `403`. Limpia secretos, contraseñas y tokens después de la prueba.

El entorno Postman versionado mantiene vacíos los secretos, las contraseñas, los tokens y los IDs generados. El realm no contiene cuentas ni credenciales reales.