# RF-01 — Agenda diaria por médico y fecha

Endpoint: `GET /citas?medicoId=<id>&fecha=<AAAA-MM-DD>` (roles `AGENDADOR` y `ADMINISTRADOR`).

## Semántica de las citas canceladas

- El listado incluye **todas** las citas del médico en esa fecha, también las `CANCELADA`, cada una con su estado.
- `cantidad` es el tamaño de ese mismo listado (canceladas incluidas), de modo que resultado y conteo siempre refieren al mismo conjunto.
- La UI muestra las canceladas con su estado, sin acciones de confirmar/reprogramar/cancelar, e indica cuántas incluye el conteo.
- Las canceladas siguen sin ocupar horario: la disponibilidad y el agendamiento las excluyen (`estado <> 'CANCELADA'`).

> Interpretación provisional: el PDF del segundo corte no define este punto y PLAN-01 (#9) sigue abierto sin respuesta del docente. Ajustar aquí si el docente indica otra regla.

## Validaciones y respuestas

| Caso | Respuesta |
|---|---|
| Falta `medicoId` o `fecha`, `medicoId` no entero o < 1, fecha con formato inválido o inexistente (p. ej. `2026-02-30`) | 400 |
| Sin sesión | 401 |
| Rol distinto de `AGENDADOR` / `ADMINISTRADOR` | 403 |
| Médico inexistente | 404 |
| Médico sin citas ese día | 200 con `{ "cantidad": 0, "citas": [] }` |
