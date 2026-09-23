package com.piedraazul.msauditoria.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "registros_auditoria")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistroAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoEvento tipoEvento;

    @Column(nullable = false)
    private String descripcion;

    @Column
    private Long entidadId;

    @Column
    private String realizadoPor;

    @Column(nullable = false)
    private String microservicioOrigen;

    @Column(nullable = false)
    private LocalDateTime fechaEvento = LocalDateTime.now();
}