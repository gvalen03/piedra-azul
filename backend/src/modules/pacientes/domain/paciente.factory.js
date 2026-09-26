import { Paciente } from "./paciente.entity.js";
import { EstadoPaciente } from "./estado-paciente.js";

export class PacienteFactory {
  static crearDesdeDTO(dto) {
    return new Paciente({
      nombre: dto.nombre,
      apellido: dto.apellido,
      numeroDocumento: dto.numeroDocumento,
      fechaNacimiento: dto.fechaNacimiento,
      email: dto.email ?? null,
      telefono: dto.telefono,
      direccion: dto.direccion ?? null,
      eps: dto.eps ?? null,
      estado: EstadoPaciente.ACTIVO,
      genero: dto.genero
    });
  }
}