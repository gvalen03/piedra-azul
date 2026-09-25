import { Paciente } from "./paciente.entity.js";
import { EstadoPaciente } from "./estado-paciente.js";

export class PacienteBuilder {
  constructor(nombre, apellido, numeroDocumento, telefono, genero) {
    this.data = {
      nombre,
      apellido,
      numeroDocumento,
      telefono,
      genero,
      estado: EstadoPaciente.ACTIVO
    };
  }

  fechaNacimiento(fechaNacimiento) {
    this.data.fechaNacimiento = fechaNacimiento;
    return this;
  }

  email(email) {
    this.data.email = email;
    return this;
  }

  direccion(direccion) {
    this.data.direccion = direccion;
    return this;
  }

  eps(eps) {
    this.data.eps = eps;
    return this;
  }

  estado(estado) {
    this.data.estado = estado;
    return this;
  }

  build() {
    return new Paciente(this.data);
  }
}