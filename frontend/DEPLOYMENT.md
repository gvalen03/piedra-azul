# GitHub Pages

El workflow `.github/workflows/pages.yml` compila y publica el frontend cuando
se suben cambios del frontend a `feature/auth`. Esa es la rama publicada;
si se traslada el desarrollo a otra rama, actualizar `on.push.branches`.

En GitHub, configurar **Settings → Pages → Source → GitHub Actions**.
El entorno `github-pages` debe permitir despliegues desde `feature/auth`.
Consultar el resultado en **Actions → Publicar frontend en GitHub Pages**.

La ruta base se obtiene de GitHub Pages. En ese despliegue se usa `HashRouter`
para poder abrir y recargar rutas como `/piedra-azul/#/paciente` sin errores 404.
En desarrollo local se mantiene el router habitual.

## Backend

GitHub Pages solo publica el frontend. El backend Fastify y PostgreSQL deben
estar alojados por separado. Configurar la variable de repositorio
`VITE_API_URL` en **Settings → Secrets and variables → Actions → Variables**
con la URL HTTPS del API, incluido `/api`, y volver a desplegar.
El backend debe permitir el origen `https://gvalen03.github.io` mediante CORS.

Sin esa variable, la página se puede ver pero las operaciones del API muestran
un mensaje de servicio no disponible. No se enviarán solicitudes a localhost
desde la versión publicada. Las variables `VITE_*` son públicas: no incluir
contraseñas, claves de base de datos ni secretos JWT.

## Comprobar la compilación localmente

Desde `frontend`:

```sh
npm ci
VITE_GITHUB_PAGES=true npm run build -- --base /piedra-azul/
npm run preview -- --base /piedra-azul/
```

Abrir `/piedra-azul/` en el servidor de preview. Para probar el API, proporcionar
también `VITE_API_URL` durante la compilación.
