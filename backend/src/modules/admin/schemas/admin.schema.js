const texto = maxLength => ({ type: "string", minLength: 1, maxLength, pattern: "\\S" });
const opcional = maxLength => ({ type: ["string", "null"], maxLength });
const email = { ...texto(150), format: "email" };
export const usuarioSchema = {
  type: "object", additionalProperties: false,
  required: ["username", "nombre", "email", "rol", "activo"],
  properties: {
    username: { ...texto(100), pattern: "^[a-zA-Z0-9._-]+$" }, nombre: texto(150), email,
    rol: { type: "string", enum: ["ADMINISTRADOR", "AGENDADOR", "MEDICO_TERAPISTA", "PACIENTE"] },
    activo: { type: "boolean" }, password: { type: "string", minLength: 8, maxLength: 72 },
    medicoId: { type: ["integer", "null"], minimum: 1 }, pacienteId: { type: ["integer", "null"], minimum: 1 }
  }
};
export const medicoSchema = {
  type: "object", additionalProperties: false,
  required: ["nombre", "apellido", "numeroDocumento", "activo"],
  properties: { nombre: texto(100), apellido: texto(100), numeroDocumento: texto(50),
    email: { ...opcional(150), format: "email" }, telefono: opcional(50), activo: { type: "boolean" } }
};
export const pacienteSchema = {
  type: "object", additionalProperties: false,
  required: ["nombre", "apellido", "numeroDocumento", "fechaNacimiento", "telefono", "genero", "estado"],
  properties: { nombre: texto(100), apellido: texto(100), numeroDocumento: texto(50),
    fechaNacimiento: { type: "string", format: "date" }, telefono: texto(50),
    email: { ...opcional(150), format: "email" }, direccion: opcional(255), eps: opcional(150),
    genero: { type: "string", enum: ["HOMBRE", "MUJER", "OTRO"] },
    estado: { type: "string", enum: ["ACTIVO", "INACTIVO"] } }
};
export const idParams = { type: "object", required: ["id"], properties: { id: { type: "integer", minimum: 1 } } };
