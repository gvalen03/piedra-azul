export class Usuario {
  constructor({
    id = null,
    username,
    password,
    nombre,
    email,
    rol,
    activo = true,
    profesionalId = null,
    pacienteId = null
  }) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.nombre = nombre;
    this.email = email;
    this.rol = rol;
    this.activo = activo;
    this.profesionalId = profesionalId;
    this.pacienteId = pacienteId;
  }
}
