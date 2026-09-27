export const registrarControlSchema = {
  body: {
    type: "object",
    required: [
      "pacienteId",
      "citaId",
      "medicoId",
      "motivoConsulta",
      "observaciones"
    ],
    properties: {
      pacienteId: {
        type: "integer"
      },
      citaId: {
        type: "integer"
      },
      medicoId: {
        type: "integer"
      },
      motivoConsulta: {
        type: "string",
        minLength: 1
      },
      observaciones: {
        type: "string",
        minLength: 1
      },
      diagnostico: {
        type: ["string", "null"]
      },
      tratamiento: {
        type: ["string", "null"]
      },
      recomendaciones: {
        type: ["string", "null"]
      }
    }
  }
};