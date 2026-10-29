# Evidencia RF-05 — Consulta de citas por documento

Fecha de implementación y verificación: 28 de octubre de 2026. Issue: [#17 — RF-05 Consultar citas de paciente por cédula](https://github.com/gvalen03/piedra-azul/issues/17).

## Interpretación del requisito

El PDF oficial del segundo corte, página 2, define RF-05 como la consulta por parte de médico/terapista/agendador de las citas de un paciente a partir de su cédula. El Issue #17 precisa búsqueda exacta y parametrizada, citas pasadas y futuras con sus estados, resultado consistente ante documentos sin coincidencias, acceso restringido y minimización de información clínica. La funcionalidad no es la consulta de controles o historia clínica.

## Implementación

- Se añadió `GET /api/historial/pacientes/:documento/citas` dentro del módulo de historial.
- La ruta exige autenticación y los roles `AGENDADOR` o `MEDICO_TERAPISTA`. Niega a `PACIENTE` y otros roles.
- Para `MEDICO_TERAPISTA`, el `medicoId` se toma del usuario autenticado y se aplica como filtro de servidor; no se acepta un perfil médico enviado por el cliente. `AGENDADOR` puede consultar sin filtro de médico.
- El repositorio usa igualdad exacta en `pacientes.numero_documento = $1` y parámetros SQL. Incluye todos los estados y fechas sin filtrar pasado/futuro.
- Solo devuelve fecha, horario, estado, paciente (nombre y documento) y profesional (nombre); excluye motivo, controles, diagnóstico, tratamiento y otros datos clínicos.
- Si no hay coincidencias, responde `200 { "citas": [] }`; no devuelve otros pacientes ni distingue si el documento existe sin citas.
- Se reutilizó `authorize` y el usuario ya validado por el mecanismo de autenticación de la aplicación. No se modificó la integración central de Keycloak/JWT.
- El componente `ConsultaCitasPaciente` se comparte entre el portal de agendador y el portal médico. Permite buscar por documento y muestra resultados pasados/futuros con sus estados.

## Evidencias de arquitectura

```text
Portal AGENDADOR / portal MEDICO_TERAPISTA
  -> ConsultaCitasPaciente (SolidJS)
  -> GET /api/historial/pacientes/:documento/citas (Fastify)
  -> authenticate + authorize + ámbito del médico autenticado
  -> HistorialService
  -> HistorialRepository
  -> PostgreSQL: pacientes JOIN citas JOIN medicos
```

La nueva consulta se mantiene bajo el módulo `historial` y no modifica `CitaRepository`, que el Issue reserva para el trabajo paralelo de RF-04. Los campos devueltos se limitan a una proyección para la tabla; la UI no recibe la entidad completa ni los controles clínicos.

## Archivos modificados

- Backend: rutas, servicio, repositorio y esquema de parámetros del módulo `historial`.
- Pruebas: `backend/test/historial.consulta.test.js`.
- Frontend: componente compartido y CSS de consulta; integración en `CitasPage.jsx` y `MedicoPage.jsx`.
- Evidencia: este documento.

## Pruebas y resultados

| Comando | Resultado |
|---|---|
| `node --test test/historial.module.test.js test/historial.consulta.test.js` (desde `backend/`) | 17/17 aprobadas, 0 fallidas. Incluye pruebas de repositorio, servicio, acceso por rol, ámbito de médico, documento vacío/largo, resultado vacío, exactitud y datos minimizados. |
| `npm run build` (desde `frontend/`) | Correcto; Vite transformó 55 módulos y generó el bundle de producción. |
| `npm test` (desde `backend/`) | 83 aprobadas, 8 fallidas de 91. |
| Suite base limpia `npm test` sobre `HEAD` anterior a RF-05 | 75 aprobadas, 8 fallidas de 83. Se reprodujeron los mismos ocho fallos en la base. |

Los ocho fallos del conjunto completo ya aparecen en la revisión base: seis pruebas de reprogramación/actualización del módulo agendador, una aserción de SQL en `medico.agenda.test.js` y una aserción de SQL en `paciente.portal.test.js`. La suite ampliada mantiene exactamente esos ocho y añade ocho pruebas RF-05 aprobadas; no se editaron los archivos afectados por dichos fallos.

## Validación de rama e Issue

- Rama: `feature/RF-05-consultar-citas-cedula`.
- `git fetch origin dev` actualizó `FETCH_HEAD`; coincide con la referencia local `origin/dev` (`79d1bfa5b63dbe7b637f6c598ab1126891aa3c52`). La rama ya contiene esa revisión; no se necesitó merge ni rebase.
- El Issue #17 está asignado a `gvalen03`, marcado como Sprint 2 y dentro del milestone “Sprint 2 — 15 al 31 de octubre de 2026”.
- Project #1 contiene 17 Issues de Sprint 2 y #17 conserva la asignación `gvalen03`.

## Pendiente y limitaciones

- No se ejecutó prueba end-to-end contra PostgreSQL ni un recorrido de UI conectado a un Keycloak real. Las pruebas de RF-05 usan Fastify inject y repositorios controlados con datos sintéticos.
- Antes de cerrar el Issue, probar el recorrido con un token real de Keycloak, verificar los claims/roles acordados y validar el aislamiento de médico con datos sintéticos en PostgreSQL.
- No se creó commit, Pull Request ni se cerró el Issue. Los cambios quedan locales para revisión.

## Validación final de servicios reales — 28 de octubre de 2026

Se comprobó rama y estado antes de validar: la rama activa fue `feature/RF-05-consultar-citas-cedula`; los diez archivos locales corresponden a RF-05; no había cambios staged; `git diff --check` no reportó errores. El stash `stash@{0}: On feature/RF-03-admin-disponibilidad: Preservar plantilla y plan antes de RF-05` permaneció intacto.

| Comprobación | Resultado observado |
|---|---|
| `pg_isready -h 127.0.0.1 -p 5432` | `127.0.0.1:5432 - no response`. No se ejecutaron consultas ni escrituras en PostgreSQL. |
| `docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'` | No pudo consultar Docker: el daemon no está disponible en `unix:///Users/valen/.docker/run/docker.sock`. |
| E2E SQL con datos sintéticos | No ejecutada: no se confirmó una instancia PostgreSQL de pruebas separada de producción. No se usó ni modificó ninguna base. |
| Flujo de UI para AGENDADOR y MEDICO_TERAPISTA | No ejecutado contra servicios: sin backend y base de datos disponibles, el flujo completo no es verificable. |
| Keycloak real | No ejecutado. La revisión del código (`backend/src` y `frontend/src`) no encontró integración/configuración de Keycloak, OpenID Connect, JWKS o issuer. El servidor actual utiliza JWT local; por ello, esta validación no simula un token de Keycloak. |
| Pruebas Fastify específicas | Repetidas en esta validación: 17/17 aprobadas. |
| Build frontend | Repetido en esta validación: `npm run build` correcto; Vite transformó 55 módulos. |

Por estas limitaciones no se verificaron contra PostgreSQL real las relaciones y consultas con registros sintéticos, las citas pasadas/futuras, los estados persistidos ni el aislamiento con datos de dos médicos. El acceso por roles, el ámbito de médico, la igualdad parametrizada, respuesta vacía y minimización de campos sí están cubiertos por las 17 pruebas específicas automatizadas, pero esas pruebas usan `Fastify inject` y repositorios controlados, no una base real ni Keycloak.

**Evaluación:** RF-05 está listo para revisión de código y pruebas automatizadas, pero la validación integral solicitada para servicios reales sigue pendiente. Antes de afirmar que el recorrido completo está validado, se necesita una base de pruebas aislada accesible y la integración/entorno de Keycloak acordado. No se alteraron archivos adicionales durante esta validación.
