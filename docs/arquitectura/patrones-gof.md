# Patrones GoF

Lista honesta de lo que existe en el código, dónde y con qué alcance.

| Patrón | Categoría | Dónde | Estado |
|---|---|---|---|
| Observer | Comportamiento | `CitaService` (sujeto) → `eventBus` → `NotificadorCitas` | Real, con pruebas |
| Factory (simple) + Builder | Creación | `PacienteFactory` → `PacienteBuilder` | Real, con pruebas |
| Singleton | Creación | `Pool` de `pg` y `eventBus` | Por módulos ES |
| Chain of Responsibility | Comportamiento | Hooks de Fastify (`authenticate` → `authorize`) | Aportado por el framework |

## Observer

- **Sujeto**: `CitaService` emite `cita.creada` y `cita.confirmada` después de guardar.
- **Observador**: `backend/src/modules/citas/application/cita-eventos.subscriber.js`, clase `NotificadorCitas`, se suscribe con `registrar(eventBus)` (devuelve una función para cancelar) y se registra en `app.js`.
- El sujeto no conoce a sus observadores: añadir correo o SMS es suscribir otro observador al mismo bus.
- **Aislamiento de fallos**: `EventEmitter` ejecuta oyentes de forma síncrona; un error subiría hasta `agendar`. Cada manejador captura y registra sus errores, así que la cita ya guardada nunca falla por el observador.
- **Limitación**: la notificación es simulada (se escribe en el log); no hay canal externo.
- Pruebas: `cita-eventos.subscriber.test.js` (9).

## Factory + Builder

- `PacienteFactory.crear(dto)` (factory estática/simple) decide cómo construir un `Paciente` y **delega en** `PacienteBuilder`, que arma el objeto paso a paso (`fechaNacimiento`, `email`, `direccion`, `eps`, `build`) con los campos opcionales en `null` por defecto.
- Pruebas: `paciente.builder.test.js` (6) y las de la fábrica.
- `UsuarioFactory` (`auth/domain`) existe y tiene pruebas, pero **no se usa en el flujo de producción**: no se afirma como patrón en uso.

## Singleton

No se implementa con una clase: el `Pool` de `pg` (`shared/db`) y el `eventBus` son instancias únicas porque el sistema de módulos ES las evalúa una sola vez. Es un singleton por convención del lenguaje, no por diseño de clase.

## Chain of Responsibility

Solo en sentido débil: el pipeline de hooks de Fastify (`authenticate` → `authorize(roles)` → handler) encadena pasos que pueden cortar la petición. Lo provee el framework; el proyecto no implementa su propia cadena.

## Principios SOLID observados

- **S**: cada capa tiene una responsabilidad (rutas, servicio, repositorio).
- **D**: los servicios reciben sus repositorios por constructor (inyección manual en `app.js`).
- **O**: nuevos observadores se añaden sin modificar `CitaService`.
