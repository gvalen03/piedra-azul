# Arquitectura de Piedra Azul

Documentación de arquitectura del monolito modular **Fastify + SolidJS + PostgreSQL**.

| Documento | Contenido |
|---|---|
| [c4.md](c4.md) | Modelo C4: contexto, contenedores y componentes |
| [vistas-4mas1.md](vistas-4mas1.md) | Vistas 4+1: lógica, procesos, desarrollo, física y escenarios |
| [patrones-gof.md](patrones-gof.md) | Patrones GoF: dónde están, cómo están implementados y qué NO está |
| [arquitectura.drawio](arquitectura.drawio) | Fuente editable (draw.io), un diagrama por pestaña |
| [img/](img/) | Los mismos diagramas exportados en SVG |

## Estilo arquitectónico

- **Monolito modular**: un solo despliegue de API; cada módulo (`auth`, `admin`, `medicos`, `disponibilidad`, `citas`, `pacientes`, `historial`, `auditoria`) se organiza en capas `domain / application / infrastructure / web / schemas`.
- **Composición manual**: `app.js` crea repositorios, servicios y controladores y los conecta por inyección manual de dependencias (sin contenedor DI).
- **Compartido** (`backend/src/shared`): `db` (Pool de `pg`, migraciones, seeds), `security` (JWT, contraseñas, `authenticate`/`authorize`) y `event-bus` (EventEmitter).
- **Frontend**: SPA SolidJS + Vite con `HashRouter`, publicada en GitHub Pages.

## Estado real frente a lo planeado

Para no documentar algo que el código no hace:

- **Autenticación**: hoy es JWT propio (bcrypt + jsonwebtoken). Keycloak (RNF-1) está **planeado**, no implementado; aparece punteado en los diagramas.
- **Notificaciones**: el observador de citas genera la notificación y la **registra en el log**; no hay canal externo (correo/SMS).
- **Despliegue**: el frontend está en GitHub Pages (`.github/workflows/pages.yml`). El servidor de la API y el de la base de datos **no están definidos en el repositorio**; la vista física lo indica así.
- **Migraciones**: los nombres `006` y `007` están intercambiados respecto a su contenido (`006` crea historias/controles, `007` crea auditorías). No afecta el orden de ejecución, pero conviene renombrarlos.

## Regenerar o editar los diagramas

Abrir `arquitectura.drawio` en [diagrams.net](https://app.diagrams.net) (cada vista es una pestaña). Los SVG de `img/` son los que se muestran en los documentos.
