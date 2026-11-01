import { PacienteBuilder } from "./paciente.builder.js";

// Patrón Factory (fábrica estática) que delega la construcción en el
// patrón Builder: la fábrica decide QUÉ crear y con qué valores por defecto
// (estado ACTIVO, opcionales en null); el Builder arma el objeto paso a paso.
export class PacienteFactory {
  static crearDesdeDTO(dto) {
    return new PacienteBuilder(
      dto.nombre,
      dto.apellido,
      dto.numeroDocumento,
      dto.telefono,
      dto.genero
    )
      .fechaNacimiento(dto.fechaNacimiento)
      .email(dto.email ?? null)
      .direccion(dto.direccion ?? null)
      .eps(dto.eps ?? null)
      .build();
  }
}
