
# RF-02 — Reserva autónoma de citas del paciente

## Objetivo

Verificar que un paciente autenticado pueda consultar la disponibilidad de los profesionales, reservar una cita para su propio perfil y gestionar su confirmación o cancelación.

## Pruebas automatizadas

Se ejecutaron desde `backend`:

```bash
node --test test/paciente.portal.test.js test/disponibilidad.flujo.test.js
```

Resultado inicial: 10 pruebas aprobadas y 1 fallida.

La prueba fallida comprobaba condiciones de seguridad del SQL mediante expresiones regulares que no admitían espacios ni saltos de línea.

Se ajustaron únicamente las expresiones regulares de `backend/test/paciente.portal.test.js` para aceptar diferencias de formato, conservando las comprobaciones del identificador del paciente, fecha, estado y parámetros.

Resultado posterior: 11 pruebas aprobadas, 0 fallidas.

## Verificación manual de interfaz — 02-nov-2026

Se ejecutó la aplicación local con frontend SolidJS, backend Fastify y PostgreSQL, utilizando una cuenta de prueba con rol PACIENTE.

Las comprobaciones fueron:

1. Inicio de sesión correcto y acceso al portal del paciente.
2. Consulta de Médico Prueba y sus horarios disponibles.
3. Selección del lunes 09-nov-2026 y reserva de la franja 08:00–08:30.
4. Mensaje de reserva exitosa y aparición de la cita en "Mis citas".
5. Comprobación de que la franja reservada dejó de ofrecerse.
6. Confirmación de asistencia y cambio de estado de PROGRAMADA a CONFIRMADA.
7. Cancelación de la misma cita y liberación de la franja 08:00–08:30.
8. Bloqueo de fechas pasadas mediante el selector de fecha.
9. Consulta de un domingo sin disponibilidad, con respuesta informativa y sin permitir una reserva.

## Seguridad y alcance

Las pruebas automatizadas verificaron que el backend utiliza la identidad de la sesión y no acepta como autoridad un identificador de paciente enviado por el cliente.

Las pruebas manuales se realizaron con una cuenta de prueba y una cita temporal, que fue cancelada al finalizar. La cancelación no implica eliminación del registro histórico.

No se verificó exhaustivamente la accesibilidad por teclado y lectores de pantalla ni todos los escenarios de error de la interfaz.

## Resultado

El flujo principal de reserva autónoma y gestión de citas funcionó satisfactoriamente en las pruebas realizadas.

Quedan pendientes la revisión del Pull Request, su integración en `dev` y las comprobaciones adicionales que solicite el revisor.