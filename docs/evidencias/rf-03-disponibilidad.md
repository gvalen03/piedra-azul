# RF-03 — Configuración administrativa de disponibilidad

Esta nota resume el contrato y las reglas implementadas para que el documento de arquitectura del Sprint 2 pueda enlazar la evidencia de RF-03.

## Flujo y componentes

- `frontend/src/pages/admin/AdminPage.jsx` permite seleccionar un médico/terapista activo desde Administración.
- `frontend/src/components/medicos/DisponibilidadMedico.jsx` consulta los bloques activos, crea y edita bloques, permite desactivarlos con confirmación y muestra una vista previa de las franjas que podrá reservar el paciente.
- `backend/src/modules/disponibilidad/web/disponibilidad.routes.js` valida solicitudes y restringe operaciones de gestión a `ADMINISTRADOR` mediante la interfaz de autorización existente.
- `backend/src/modules/disponibilidad/application/disponibilidad.service.js` valida los parámetros y construye las franjas disponibles.
- `backend/src/modules/disponibilidad/infrastructure/disponibilidad.repository.js` persiste los cambios en PostgreSQL dentro de transacciones.
- `backend/src/shared/db/migrations/004_create_disponibilidades.sql` define la tabla, FK, restricciones básicas e índice único del bloque exacto.

## API administrativa

Todas las rutas de gestión requieren sesión y rol `ADMINISTRADOR`.

| Método y ruta | Uso | Respuesta/efecto |
|---|---|---|
| `GET /api/disponibilidad?medicoId={id}` | Consultar los bloques activos de un profesional | Lista ordenada por día y hora |
| `POST /api/disponibilidad` | Crear un bloque | Recibe `medicoId`, `diaSemana`, `horaInicio`, `horaFin`, `intervaloMinutos` y `semanasHabilitadas`; responde 201 |
| `PUT /api/disponibilidad/{id}` | Editar un bloque existente | Recibe los mismos campos; actualiza día, horas, duración y horizonte del bloque seleccionado |
| `DELETE /api/disponibilidad/{id}?medicoId={id}` | Desactivar un bloque | Lo excluye de nuevas franjas y conserva las citas ya registradas |

`GET /api/disponibilidad/franjas?medicoId={id}&fecha=AAAA-MM-DD` alimenta la vista previa y el flujo de reserva. La consulta solo considera profesionales activos, bloques activos, días configurados, el horizonte de semanas y las citas que ya ocupan el horario.

## Reglas de negocio y persistencia

- El día debe pertenecer a `LUNES`–`DOMINGO`; las horas deben tener formato `HH:mm` y cumplir `horaInicio < horaFin`.
- La duración y el horizonte deben ser enteros positivos. La duración debe caber dentro del bloque.
- No se aceptan solapes entre bloques activos del mismo profesional y día. La escritura bloquea la fila del profesional y comprueba el solape dentro de la transacción; el bloque que se está editando se excluye de esa comprobación.
- No se crean ni actualizan bloques para un profesional inactivo.
- La ventana es móvil desde la fecha actual en `America/Bogota`: para una configuración con `N` semanas, se generan franjas cuando la fecha solicitada está entre hoy y antes de `N × 7` días desde hoy.
- Las reservas se vuelven a validar bajo bloqueo al guardarse. Editar o desactivar disponibilidad no ejecuta operaciones sobre la tabla `citas`; las reservas existentes se conservan.
- La base de datos también restringe días, horario invertido, valores no positivos, borrado del profesional con disponibilidad asociada y duplicados exactos de profesional/día/inicio/fin.

## Pruebas

Las pruebas automatizadas específicas están en:

- `backend/src/modules/disponibilidad/application/disponibilidad.service.test.js`
- `backend/src/modules/disponibilidad/infrastructure/disponibilidad.repository.test.js`
- `backend/test/disponibilidad.flujo.test.js`

Las pruebas automatizadas usan Fastify injection y repositorios controlados. Además, la validación E2E registrada abajo ejecutó la aplicación Fastify real por HTTP contra PostgreSQL local.

## Ejecución registrada — 26-oct-2026

- Línea base previa: `cd backend && npm test` → 75/83 pasaron y 8 fallaron. Eran fallos en reprogramación/actualización de citas y expectativas SQL de agenda/portal, fuera de RF-03.
- Suite específica final: desde `backend`, `node --test src/modules/disponibilidad/application/disponibilidad.service.test.js src/modules/disponibilidad/infrastructure/disponibilidad.repository.test.js test/disponibilidad.flujo.test.js` → 14/14 pasaron.
- Suite backend final: `cd backend && npm test` → 80/88 pasaron y los mismos 8 fallaron; no se modificaron esas pruebas ni módulos ajenos.
- Build final frontend: `cd frontend && npm run build` → correcto (53 módulos transformados).
- `git diff --check` → sin errores.
- E2E local (26-oct-2026): `cd backend && node --input-type=module` ejecutó `buildApp()` en un puerto loopback efímero, solicitó sus rutas HTTP reales y conectó al PostgreSQL local configurado en `backend/.env`. Se usaron médico, paciente, cuentas, bloques y citas sintéticos con identificador aleatorio; no se consultaron registros ajenos. El `finally` borró exclusivamente los IDs creados por la prueba y cerró aplicación y conexión.
- Resultado E2E: 7 grupos de comprobaciones aprobados: login JWT sintético de ADMINISTRADOR y PACIENTE; alta de disponibilidad y agendamiento previo; edición `PUT` que conservó el ID (sin duplicar), con lectura posterior de día, horas, intervalo y semanas; error 400 para intervalo inválido y 409 para solapamiento; rechazo 403 al rol PACIENTE; franjas nuevas reflejadas y posterior reserva HTTP; cita previa conservada con misma fecha, hora y estado.
- Alcance pendiente: el recorrido comprobó la API y persistencia real, incluida la lectura equivalente a recargar los datos; no automatizó el navegador y por tanto no confirma el render visual de la pantalla ni la interacción DOM. La interfaz sí pasó el build de producción (53 módulos transformados). Las pruebas de agenda de extremo a extremo no usaron datos clínicos o personales reales.
- La integración E2E no depende de Docker ni de `pg_isready` en `/tmp:5432`; la app pudo conectarse al PostgreSQL local definido por el entorno. No se aplicaron migraciones ni se modificaron tablas/esquemas durante la prueba.
