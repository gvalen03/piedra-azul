export const consultarCitasSchema = {
  querystring: {
    type: "object",
    required: [
      "medicoId",
      "fecha"
    ],
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
        type: "string"
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