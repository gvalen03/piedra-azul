export const registrarPacienteSchema = {
  body: {
    type: "object",
    required: [
      "nombre",
      "apellido",
      "numeroDocumento",
      "fechaNacimiento",
      "telefono",
      "genero"
    ],
    properties: {
      nombre: {
        type: "string",
        minLength: 1, pattern: "\\S", maxLength: 100
      },

      apellido: {
        type: "string",
        minLength: 1, pattern: "\\S", maxLength: 100
      },

      numeroDocumento: {
        type: "string",
        minLength: 1, pattern: "\\S", maxLength: 50
      },

      fechaNacimiento: {
        type: "string",
        format: "date"
      },

      email: {
        type: ["string", "null"],
        format: "email", maxLength: 150
      },

      telefono: {
        type: "string", minLength: 1, maxLength: 50, pattern: "\\S"
      },

      direccion: {
        type: ["string", "null"], maxLength: 255
      },

      eps: {
        type: ["string", "null"], maxLength: 150
      },

      genero: {
        type: "string",
        enum: ["HOMBRE", "MUJER", "OTRO"]
      }
    }
  }
};

export const registroAutonomoPacienteSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["nombre", "apellido", "numeroDocumento", "fechaNacimiento", "email", "telefono", "genero", "username", "password"],
    properties: {
      ...registrarPacienteSchema.body.properties,
      email: { type: "string", format: "email", maxLength: 150 },
      username: { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-zA-Z0-9._-]+$" },
      password: { type: "string", minLength: 8, maxLength: 72 }
    }
  }
};
