export const aprovisionarUsuarioSchema = {
  type: "object", additionalProperties: false,
  required: ["username", "password", "nombre", "apellido", "numeroDocumento", "email", "rol"],
  properties: {
    username: { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-zA-Z0-9._-]+$" }, password: { type: "string", minLength: 8, maxLength: 72 },
    nombre: { type: "string", minLength: 1, maxLength: 100 }, apellido: { type: "string", minLength: 1, maxLength: 100 },
    numeroDocumento: { type: "string", minLength: 1, maxLength: 50 }, email: { type: "string", format: "email", maxLength: 150 }, telefono: { type: ["string", "null"], maxLength: 50 },
    rol: { type: "string", enum: ["PACIENTE", "MEDICO_TERAPISTA", "AGENDADOR", "ADMINISTRADOR"] },
    pacienteId: { type: ["integer", "null"], minimum: 1 }, profesionalId: { type: ["integer", "null"], minimum: 1 },
    fechaNacimiento: { type: ["string", "null"], format: "date" }, direccion: { type: ["string", "null"], maxLength: 255 }, eps: { type: ["string", "null"], maxLength: 150 },
    genero: { type: ["string", "null"], enum: ["HOMBRE", "MUJER", "OTRO", null] }, tipoProfesional: { type: ["string", "null"], enum: ["MEDICO", "TERAPISTA", null] }
  }
};
