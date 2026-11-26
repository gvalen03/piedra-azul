# KAN-48 — Pruebas del flujo de cancelación de citas

- **Proyecto:** Piedra Azul
- **Fecha de ejecución:** 26 de noviembre de 2026
- **Entorno:** Desarrollo local
- **Base de datos:** `piedra_azul_refactor`

## 1. Objetivo

Comprobar el funcionamiento de la cancelación de citas desde el portal del paciente, verificando el registro de la justificación, la restricción de 48 horas y la posibilidad de reservar nuevamente un horario liberado.

## 2. Pruebas funcionales

| Caso de prueba | Resultado esperado | Resultado obtenido |
|---|---|---|
| Cancelar una cita válida | La cita cambia a `CANCELADA` | Correcto |
| Registrar la justificación | El motivo queda almacenado en PostgreSQL | Correcto |
| Registrar la fecha de cancelación | El campo `cancelada_at` contiene una fecha | Correcto |
| Actualizar las citas del paciente | La cita cancelada aparece en el historial | Correcto |
| Liberar el horario | El horario vuelve a estar disponible | Correcto |
| Reservar el horario liberado | Se permite crear una nueva cita | Correcto |
| Cancelar con menos de 48 horas | La interfaz muestra una advertencia y bloquea la confirmación | Correcto |
| Conservar una cita no cancelable | La cita permanece en estado `PROGRAMADA` | Correcto |

### 2.1. Cancelación válida

Se utilizó una cita del 30 de noviembre de 2026 a las 09:00, correspondiente a la profesional Laura García.

Desde el portal del paciente se ingresó una justificación y se confirmó la cancelación.

Posteriormente, se verificó que la cita apareciera con estado `CANCELADA` en la sección de citas anteriores y canceladas.

Mediante DBeaver se consultó la tabla `citas`, confirmando que la justificación y la fecha de cancelación quedaron registradas.

### 2.2. Reutilización del horario

Después de cancelar la cita, se consultó nuevamente la disponibilidad de Laura García para el 30 de noviembre.

El horario de 09:00 a 09:30 volvió a aparecer disponible y se realizó una nueva reserva en esa misma franja.

La reserva se completó correctamente.

### 2.3. Restricción de 48 horas

Se creó una cita de prueba para el 27 de noviembre de 2026 a las 15:00.

Al intentar cancelarla desde el portal del paciente, el sistema mostró una advertencia indicando que faltaban menos de 48 horas para su inicio.

Aunque se ingresó una justificación, el botón de confirmación permaneció deshabilitado.

Posteriormente, se comprobó que la cita seguía en estado `PROGRAMADA`.

## 3. Prueba automatizada de integración

Se ejecutó la prueba existente del backend:

`backend/test/cancelacion.citas.integration.test.js`

Comandos utilizados desde la carpeta `backend` en PowerShell:

```powershell
$env:RUN_POSTGRES_INTEGRATION_TESTS = "1"
node --test test/cancelacion.citas.integration.test.js
Remove-Item Env:RUN_POSTGRES_INTEGRATION_TESTS
```

**Resultado:** 1 prueba correcta, 0 fallidas.

Esta prueba, desarrollada previamente en el backend, comprueba varios escenarios de cancelación, incluidos rechazos de solicitudes, persistencia y liberación de horarios. Se reutilizó para verificar la compatibilidad con la implementación del frontend.

La prueba automatizada del backend y las comprobaciones realizadas desde el navegador son verificaciones diferentes.

## 4. Verificaciones técnicas

Se comprobó la conexión entre Fastify y PostgreSQL mediante el endpoint `/health/db`.

Se aplicaron y verificaron localmente las migraciones `013` y `014`, necesarias para mantener la base de datos actualizada.

La compilación del frontend mediante `npm --prefix .\frontend run build` terminó correctamente.

## 5. Observaciones

Durante las pruebas se observó una visualización incorrecta de algunos caracteres acentuados en el nombre de la profesional. Esta situación queda pendiente de revisión y no se identificó su causa dentro de estas pruebas.

No se modificaron las pruebas existentes del backend ni las funcionalidades desarrolladas por otros integrantes del equipo.

## 6. Conclusión

Los escenarios funcionales ejecutados presentaron el comportamiento esperado. Se verificó la cancelación desde la interfaz, el almacenamiento de sus datos, la reutilización del horario y el bloqueo de cancelaciones fuera del plazo permitido.

También se ejecutó satisfactoriamente la prueba de integración existente del backend. Con estos resultados se cuenta con evidencia funcional para la tarea KAN-48.