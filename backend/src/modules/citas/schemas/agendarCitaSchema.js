export const agendarCitaSchema = {
  body: {
    type: "object",
    required: [
      "pacienteId",
      "profesionalId",
      "fecha",
      "horaInicio"
    ],
    properties: {
      pacienteId: {
        type: "integer"
      },
      profesionalId: {
        type: "integer"
      },
      fecha: {
        type: "string",
        format: "date"
      },
      horaInicio: {
        type: "string"
      },
      motivo: {
        type: ["string", "null"]
      }
    }
  }
};
