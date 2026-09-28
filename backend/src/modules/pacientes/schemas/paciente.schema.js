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