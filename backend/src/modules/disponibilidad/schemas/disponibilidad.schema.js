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
        type: "integer"
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
        type: "string"
      },

      horaFin: {
        type: "string"
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