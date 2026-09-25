export class Paciente {
  constructor({
    id = null,
    nombre,
    apellido,
    numeroDocumento,
    fechaNacimiento,
    email = null,
    telefono,
    direccion = null,
    eps = null,
    estado = "ACTIVO",
    genero
  }) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.numeroDocumento = numeroDocumento;
    this.fechaNacimiento = fechaNacimiento;
    this.email = email;
    this.telefono = telefono;
    this.direccion = direccion;
    this.eps = eps;
    this.estado = estado;
    this.genero = genero;
  }
}