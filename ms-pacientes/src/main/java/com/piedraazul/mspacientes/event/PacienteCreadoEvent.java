package com.piedraazul.mspacientes.event;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

// ══════════════════════════════════════════════════════
// PATRÓN GOF: OBSERVER
// Este evento notifica a otros microservicios (auditoria)
// que un nuevo paciente fue registrado en el sistema
// ══════════════════════════════════════════════════════
@Data
@AllArgsConstructor
public class PacienteCreadoEvent {

    private Long pacienteId;
    private String nombre;
    private String numeroDocumento;
    private LocalDateTime fechaCreacion;
    private String origen; // "AUTONOMO" o "RECEPCIONISTA"
}