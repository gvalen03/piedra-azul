export class Medico {
  constructor({ id = null, nombre, apellido, numeroDocumento, email = null, telefono = null, activo = true }) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.numeroDocumento = numeroDocumento;
    this.email = email;
    this.telefono = telefono;
    this.activo = activo;
  }
}