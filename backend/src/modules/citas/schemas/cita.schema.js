export const consultarCitasSchema = {
  querystring: {
    type: "object",
    required: ["medicoId", "fecha"],
    properties: {
      medicoId: {
        type: "integer"
      },
      fecha: {
        type: "string",
        format: "date"
      }
    }
  }
};