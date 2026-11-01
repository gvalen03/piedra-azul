# RF-04 — Exportar citas por médico/fecha a CSV

Endpoint: `GET /citas/exportar?medicoId=<id>&fecha=<AAAA-MM-DD>`

## Rama base (constancia)

Esta funcionalidad (`feature/RF-04-exportar-csv`, issue #16) se creó **a partir de `feature/RF-01-agenda-diaria`** (issue #13) y no directamente desde `dev`, por decisión del responsable (Miguel Pérez, 2026-11-01): no trabajar sobre `dev` y reutilizar las validaciones de RF-01 (`consultarPorMedicoYFecha`), de las que depende el issue (#16 depende de RF-01).

Consecuencias para la integración:
- Integrar primero el PR de #13 a `dev`; después el PR de #16, que a partir de ese momento solo mostrará los cambios propios de RF-04.
- Si el PR de #16 se abre antes de integrar #13, su diff incluirá también el commit de #13.

## Roles y alcance

| Rol | Acceso |
|---|---|
| `AGENDADOR` | Debe enviar `medicoId` (400 si falta). Puede exportar cualquier médico. |
| `MEDICO_TERAPISTA` | Solo su propia agenda: `medicoId` se toma del token; si envía otro → 403. |
| `ADMINISTRADOR`, `PACIENTE` | 403 (el issue limita el alcance a médico/terapista/agendador). |
| Sin sesión | 401 (se comprueba antes de validar los parámetros). |

## Contenido del archivo

- Conjunto: citas del médico en esa fecha **excepto las `CANCELADA`** (incluye `PROGRAMADA`, `CONFIRMADA` y `ATENDIDA`). Cero citas devuelve un CSV válido con solo los encabezados.
- Columnas: `Fecha, Hora inicio, Hora fin, Documento, Paciente, Estado, Motivo`.
- Formato: RFC 4180 (separador coma, CRLF), UTF-8 con BOM para que las hojas de cálculo muestren bien las tildes. Comillas, comas y saltos de línea dentro de un campo se escapan.
- Seguridad: los textos que empiezan por `=`, `+`, `-`, `@` (también tras espacios) o por tabulador/retorno se antepone una comilla simple (`'`), de modo que la hoja de cálculo no los ejecute como fórmula (OWASP CSV Injection).
- Cabeceras de respuesta: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="citas_medico-<id>_<fecha>.csv"`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`.

> Interpretación provisional: ni el PDF del segundo corte ni PLAN-01 (#9, abierto) definen las columnas ni si se incluyen las canceladas. Se asumió el listado de la jornada de atención. Ajustar aquí y en `CitaService.exportarCsv` si el docente indica otra cosa.

## Limitaciones conocidas

- Separador coma: en Excel configurado con separador de listas `;` (p. ej. algunas configuraciones regionales) puede ser necesario importar el archivo (Datos → Desde texto/CSV) en lugar de abrirlo con doble clic. Verificado con LibreOffice Calc, no con Excel.
- Un campo que empieza por `+`/`-`/`@`/`=` (p. ej. un documento `+57…`) se exporta con la comilla simple delante.
