package com.piedraazul.mshistorial.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

// ══════════════════════════════════════════════════════
// PATRÓN GOF: MEMENTO
// Propósito: guardar el estado anterior de una cita
// antes de reagendarla, permitiendo trazabilidad
// completa del historial de cambios.
// HU-04b — Reagendamiento con historial de cambios
// ══════════════════════════════════════════════════════
@Entity
@Table(name = "cambios_agenda")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CambioAgenda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long citaId;

    @Column(nullable = false)
    private Long pacienteId;

    @Column(nullable = false)
    private Long medicoId;

    // Estado anterior (Memento — snapshot)
    @Column(nullable = false)
    private LocalDateTime fechaHoraAnterior;

    // Estado nuevo
    @Column(nullable = false)
    private LocalDateTime fechaHoraNueva;

    @Column
    private String motivoCambio;

    @Column(nullable = false)
    private String cambiadoPor;

    @Column(nullable = false)
    private LocalDateTime fechaCambio = LocalDateTime.now();
}