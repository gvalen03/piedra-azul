package com.piedraazul.mshistorial.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "historial_clinico")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistorialClinico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long pacienteId;

    @Column(nullable = false)
    private Long medicoId;

    @Column(nullable = false)
    private Long citaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoRegistro tipoRegistro;

    @Column(nullable = false, length = 2000)
    private String descripcion;

    @Column(length = 1000)
    private String diagnostico;

    @Column(length = 1000)
    private String tratamiento;

    @Column(nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @Column(nullable = false)
    private String registradoPor;
}