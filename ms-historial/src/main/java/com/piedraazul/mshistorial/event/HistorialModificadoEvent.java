package com.piedraazul.mshistorial.event;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

// PATRÓN GOF: OBSERVER
// Notifica a ms-auditoria cuando se modifica
// un historial clínico
@Data
@AllArgsConstructor
public class HistorialModificadoEvent {

    private Long historialId;
    private Long pacienteId;
    private Long medicoId;
    private String tipoAccion; // "CREACION", "REAGENDAMIENTO"
    private String realizadoPor;
    private LocalDateTime fechaEvento;
}