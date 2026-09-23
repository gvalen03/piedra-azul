package com.piedraazul.ui.pacientes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Paciente {

    private Long id;
    private String nombre;
    private String apellido;
    private String numeroDocumento;
    private String telefono;
    private String genero;
    private String email;
    private String estado;


    public Paciente() {
    }

    public Long getId() {
        return id;
    }

    public String getNombreCompleto() {
        String n = nombre != null ? nombre : "";
        String a = apellido != null ? apellido : "";
        return n + " " + a;
    }

    public String getNumeroDocumento() {
        return numeroDocumento;
    }

    public String getTelefono() {
        return telefono;
    }

    public String getGenero() {
        return genero;
    }

    public String getEmail() {
        return email;
    }
    public String getNombre() {
        return nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public String getEstado() {
        return estado;
    }
    public void setId(Long id) {
        this.id = id;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public void setNumeroDocumento(String numeroDocumento) {
        this.numeroDocumento = numeroDocumento;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public void setGenero(String genero) {
        this.genero = genero;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

}