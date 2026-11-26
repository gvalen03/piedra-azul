export const consultarCitasSchema = {
  querystring: {
    type: "object",
    required: [
      "profesionalId",
      "fecha"
    ],
    properties: {
      profesionalId: {
        type: "integer"
      },

      fecha: {
        type: "string",
        format: "date"
      }
    }
  }
};

export const exportarCitasSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    required: ["fecha"],
    properties: {
      profesionalId: {
        type: "integer",
        minimum: 1
      },
      fecha: {
        type: "string",
        format: "date"
      }
    }
  }
};

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

export const confirmarCitaSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: {
        type: "integer"
      }
    }
  }
};

export const cancelarCitaPacienteSchema = {
  params: confirmarCitaSchema.params,
  body: {
    type: "object",
    additionalProperties: false,
    required: ["justificacion"],
    properties: {
      justificacion: { type: "string", minLength: 1, maxLength: 1000, pattern: "\\S" }
    }
  }
};
