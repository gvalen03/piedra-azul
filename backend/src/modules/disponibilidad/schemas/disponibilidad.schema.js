export const configurarDisponibilidadSchema = {
  body: {
    type: "object",
    required: [
      "medicoId",
      "diaSemana",
      "horaInicio",
      "horaFin",
      "intervaloMinutos",
      "semanasHabilitadas"
    ],
    properties: {
      medicoId: {
        type: "integer", minimum: 1
      },

      diaSemana: {
        type: "string",
        enum: [
          "LUNES",
          "MARTES",
          "MIERCOLES",
          "JUEVES",
          "VIERNES",
          "SABADO",
          "DOMINGO"
        ]
      },

      horaInicio: {
        type: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$"
      },

      horaFin: {
        type: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$"
      },

      intervaloMinutos: {
        type: "integer",
        minimum: 1
      },

      semanasHabilitadas: {
        type: "integer",
        minimum: 1
      }
    }
  }
};