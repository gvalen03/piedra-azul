export const loginSchema = {
  body: {
    type: "object",
    required: [
      "username",
      "password"
    ],

    properties: {
      username: {
        type: "string",
        minLength: 1,
        maxLength: 100
      },

      password: {
        type: "string",
        minLength: 1,
        maxLength: 255
      }
    },

    additionalProperties: false
  },

  response: {
    200: {
      type: "object",

      properties: {
        token: {
          type: "string"
        },

        rol: {
          type: "string"
        },

        nombre: {
          type: "string"
        },

        usuarioId: {
          type: "integer"
        },

        pacienteId: {
          anyOf: [
            { type: "integer" },
            { type: "null" }
          ]
        },

        medicoId: {
          anyOf: [
            { type: "integer" },
            { type: "null" }
          ]
        }
      },

      required: [
        "token",
        "rol",
        "nombre",
        "usuarioId",
        "pacienteId",
        "medicoId"
      ]
    },

    401: {
      type: "object",

      properties: {
        message: {
          type: "string"
        }
      },

      required: [
        "message"
      ]
    }
  }
};