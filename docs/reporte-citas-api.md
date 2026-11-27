# Contrato de API: reporte anual de citas

## Solicitud

`GET /api/reportes/citas?anio=2026`

Requiere autenticación. El parámetro `anio` es obligatorio y debe ser un año de cuatro dígitos entre `1900` y `9999`.

## Autorización y alcance

- `MEDICO_TERAPISTA`: consulta únicamente sus propias citas. El profesional se obtiene de la identidad autenticada; el cliente no puede enviar ni elegir otro `profesionalId`.
- `AGENDADOR` y `ADMINISTRADOR`: consultan el reporte de todos los profesionales.
- Los demás roles reciben `403`.
- Una cuenta de médico sin un profesional asociado recibe `403`.

## Reglas del conteo

- Cada cita se agrupa por el año y mes de su fecha (`citas.fecha`).
- Se cuentan todos los estados, incluidas las citas `CANCELADA`.
- El reporte incluye profesionales que tengan al menos una cita en el año solicitado.
- Para médicos, la respuesta incluye únicamente al profesional autenticado.
- Los meses siempre aparecen en orden de enero a diciembre; los meses sin citas tienen cantidad `0`.
- Los nombres de los meses se devuelven en español.
- Si no hay citas para el año y alcance solicitados, `profesionales` es un arreglo vacío.

## Respuesta exitosa

Código `200`:

```json
{
  "anio": 2026,
  "meses": [
    { "numero": 1, "nombre": "Enero" },
    { "numero": 2, "nombre": "Febrero" },
    { "numero": 3, "nombre": "Marzo" },
    { "numero": 4, "nombre": "Abril" },
    { "numero": 5, "nombre": "Mayo" },
    { "numero": 6, "nombre": "Junio" },
    { "numero": 7, "nombre": "Julio" },
    { "numero": 8, "nombre": "Agosto" },
    { "numero": 9, "nombre": "Septiembre" },
    { "numero": 10, "nombre": "Octubre" },
    { "numero": 11, "nombre": "Noviembre" },
    { "numero": 12, "nombre": "Diciembre" }
  ],
  "profesionales": [
    {
      "profesionalId": 18,
      "nombre": "Laura",
      "apellido": "García",
      "citasPorMes": [2, 0, 3, 1, 0, 0, 4, 0, 0, 0, 0, 0],
      "totalAnual": 10
    }
  ]
}
```

`citasPorMes` contiene exactamente doce valores; el índice `0` representa enero y el índice `11`, diciembre. `totalAnual` es la suma de esos valores.

## Errores

- `400`: parámetro `anio` ausente o inválido.
- `401`: token ausente, inválido o expirado.
- `403`: rol no autorizado o cuenta de médico sin profesional asociado.

Los errores usan el formato JSON de error que ya esta en la API.
