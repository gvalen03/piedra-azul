package com.piedraazul.ui.auditoria;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
public class Auditoria {

    private Long id;
    private String tipoEvento;
    private String descripcion;
    private Long entidadId;
    private String realizadoPor;
    private String microservicioOrigen;
    private String fechaEvento;

    public Auditoria() {
    }

    public Long getId() {
        return id;
    }

    public String getTipoEvento() {
        return tipoEvento;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public Long getEntidadId() {
        return entidadId;
    }

    public String getRealizadoPor() {
        return realizadoPor;
    }

    public String getMicroservicioOrigen() {
        return microservicioOrigen;
    }

    public String getFechaEvento() {
        return fechaEvento;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setTipoEvento(String tipoEvento) {
        this.tipoEvento = tipoEvento;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public void setEntidadId(Long entidadId) {
        this.entidadId = entidadId;
    }

    public void setRealizadoPor(String realizadoPor) {
        this.realizadoPor = realizadoPor;
    }

    public void setMicroservicioOrigen(String microservicioOrigen) {
        this.microservicioOrigen = microservicioOrigen;
    }

    public void setFechaEvento(String fechaEvento) {
        this.fechaEvento = fechaEvento;
    }
}

