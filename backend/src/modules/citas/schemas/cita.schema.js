export const consultarCitasSchema = {
  querystring: {
    type: "object",
    required: [
      "medicoId",
      "fecha"
    ],
    properties: {
      medicoId: {
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

// RF-04: medicoId es opcional porque el médico exporta siempre su propia
// agenda (se toma del token); el agendador debe enviarlo.
export const exportarCitasSchema = {
  querystring: {
    type: "object",
    required: ["fecha"],
    properties: {
      medicoId: {
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