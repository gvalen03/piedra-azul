package com.piedraazul.mspacientes.model;

import com.piedraazul.mspacientes.dto.PacienteDTO;

// ══════════════════════════════════════════════════════
// PATRÓN GOF: FACTORY METHOD
// Propósito: centralizar la creación de objetos Paciente
// a partir de un DTO, ocultando la lógica de construcción.
// HU-02 / HU-09 — Registro de pacientes
// ══════════════════════════════════════════════════════
public class PacienteFactory {

    public static Paciente crearDesdeDTO(PacienteDTO dto) {
        return new PacienteBuilder(
                dto.getNombre(),
                dto.getApellido(),
                dto.getNumeroDocumento(),
                dto.getTelefono(),
                dto.getGenero()
        )
                .fechaNacimiento(dto.getFechaNacimiento())
                .email(dto.getEmail())
                .direccion(dto.getDireccion())
                .eps(dto.getEps())
                .estado(dto.getEstado() != null ? dto.getEstado() : EstadoPaciente.ACTIVO)
                .build();
    }
}
