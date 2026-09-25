export const agendarCitaSchema = {
  body: {
    type: "object",
    required: [
      "pacienteId",
      "medicoId",
      "fecha",
      "horaInicio"
    ],
    properties: {
      pacienteId: {
        type: "integer"
      },
      medicoId: {
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