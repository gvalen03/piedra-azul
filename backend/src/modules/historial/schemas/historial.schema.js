export const citaParams = { type: "object", required: ["citaId"], properties: { citaId: { type: "integer", minimum: 1 } } };
export const registrarControlSchema = {
  params: citaParams,
  body: {
    type: "object", additionalProperties: false,
    required: ["motivoConsulta", "observaciones"],
    properties: {
      motivoConsulta: { type: "string", minLength: 1, maxLength: 5000, pattern: "\\S" },
      observaciones: { type: "string", minLength: 1, maxLength: 10000, pattern: "\\S" },
      diagnostico: { type: ["string", "null"], maxLength: 10000 },
      tratamiento: { type: ["string", "null"], maxLength: 10000 },
      recomendaciones: { type: ["string", "null"], maxLength: 10000 }
    }
  }
};
