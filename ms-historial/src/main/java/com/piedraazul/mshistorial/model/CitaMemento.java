package com.piedraazul.mshistorial.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// ══════════════════════════════════════════════════════
// PATRÓN GOF: MEMENTO
// Esta clase guarda una "fotografía" del estado
// de una cita antes de ser modificada.
// El Originator es CitaService, el Caretaker es
// HistorialService que guarda los Mementos.
// ══════════════════════════════════════════════════════
@Getter
@AllArgsConstructor
public class CitaMemento {

    private final Long citaId;
    private final Long pacienteId;
    private final Long medicoId;
    private final LocalDateTime fechaHoraAnterior;
    private final String estado;
    private final LocalDateTime fechaCaptura = LocalDateTime.now();
}