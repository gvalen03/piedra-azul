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
        minLength: 1
      },

      apellido: {
        type: "string",
        minLength: 1
      },

      numeroDocumento: {
        type: "string",
        minLength: 1
      },

      fechaNacimiento: {
        type: "string",
        format: "date"
      },

      email: {
        type: ["string", "null"],
        format: "email"
      },

      telefono: {
        type: "string"
      },

      direccion: {
        type: ["string", "null"]
      },

      eps: {
        type: ["string", "null"]
      },

      genero: {
        type: "string",
        enum: ["HOMBRE", "MUJER", "OTRO"]
      }
    }
  }
};