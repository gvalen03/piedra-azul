# ADM-01 — Desactivación/reactivación transaccional de médicos y pacientes

Solo `ADMINISTRADOR`. Rutas bajo `/api/admin`, separadas del `PUT` genérico:

| Ruta | Efecto |
|---|---|
| `GET /{medicos\|pacientes}/:id/desactivacion` | Vista previa: cantidad exacta e ids de las citas pendientes que se cancelarían. No cambia nada. |
| `POST /{medicos\|pacientes}/:id/desactivar` con `{ "cantidadEsperada": N }` | Desactiva el perfil y cancela sus citas futuras pendientes, todo en una transacción. |
| `POST /{medicos\|pacientes}/:id/reactivar` | Solo cambia el estado del perfil. Las citas canceladas **no** se restauran. |

## Reglas

- **Pendiente** = `PROGRAMADA` o `CONFIRMADA` cuyo inicio aún no ocurre en hora `America/Bogota`. Se conservan `CANCELADA`, `ATENDIDA`, las antiguas, los controles y el historial.
- **Confirmación explícita** aunque la cantidad sea 0 (`cantidadEsperada: 0`).
- **Revalidación bajo bloqueo:** se bloquea la fila del perfil (`FOR UPDATE`, el mismo bloqueo que toma el agendamiento sobre el médico y que cede sobre el paciente) y se recuentan las pendientes. Si la cantidad difiere de `cantidadEsperada`, responde **409** con `cantidadActual` y las citas, y no cambia nada; la UI muestra el nuevo valor y pide reconfirmar.
- **Todo o nada:** si falla el cambio de estado, la cancelación o la auditoría, se revierte la transacción completa. Ante un deadlock se reintenta una vez desde cero y, si persiste, responde 409.
- **Auditoría** (`modulo_origen = ADMINISTRACION`, tipos `MEDICOS_DESACTIVADO`, `PACIENTES_DESACTIVADO`, `*_REACTIVADO`): actor, tipo y id del perfil, cantidad e ids de las citas canceladas en `datos_adicionales`. Se escribe dentro de la misma transacción.
- **`PUT` genérico:** sigue editando los demás campos, pero responde 400 si intenta cambiar activo↔inactivo. El estado solo cambia con las acciones Desactivar/Reactivar.
- Un perfil inactivo no puede recibir reservas nuevas aunque se manipule la UI: el agendamiento ya exige `activo = TRUE` / `estado = 'ACTIVO'` bajo bloqueo.

## Pruebas

```bash
cd backend && npm test        # unitarias (sin base de datos)
cd frontend && npm test       # textos del diálogo

# Integración con PostgreSQL real (transacciones, concurrencia, rollback, zona horaria).
# Crea un esquema propio adm01_* y lo elimina al terminar; sin esta variable se omiten.
cd backend && TEST_DATABASE_URL=postgres://usuario:clave@localhost:5432/postgres npm test
```

## Pendiente (evidencias del issue)

- Diagrama de secuencia / actualización del documento de arquitectura.
- Captura del diálogo y de la reconfirmación en la UI.
