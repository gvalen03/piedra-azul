package com.piedraazul.mspacientes.model;

import java.time.LocalDate;

// ══════════════════════════════════════════════════════
// PATRÓN GOF: BUILDER
// Propósito: construir un objeto Paciente paso a paso,
// permitiendo campos opcionales sin constructores enormes.
// HU-09 — Registro autónomo del paciente
// ══════════════════════════════════════════════════════
public class PacienteBuilder {

    // Campos obligatorios
    private final String nombre;
    private final String apellido;
    private final String numeroDocumento;
    private final String telefono;
    private final Genero genero;

    // Campos opcionales
    private LocalDate fechaNacimiento;
    private String email;
    private String direccion;
    private String eps;
    private EstadoPaciente estado = EstadoPaciente.ACTIVO;

    public PacienteBuilder(String nombre,
                           String apellido,
                           String numeroDocumento,
                           String telefono,
                           Genero genero) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.numeroDocumento = numeroDocumento;
        this.telefono = telefono;
        this.genero = genero;
    }

    public PacienteBuilder fechaNacimiento(LocalDate fechaNacimiento) {
        this.fechaNacimiento = fechaNacimiento;
        return this;
    }

    public PacienteBuilder email(String email) {
        this.email = email;
        return this;
    }

    public PacienteBuilder direccion(String direccion) {
        this.direccion = direccion;
        return this;
    }

    public PacienteBuilder eps(String eps) {
        this.eps = eps;
        return this;
    }

    public PacienteBuilder estado(EstadoPaciente estado) {
        this.estado = estado;
        return this;
    }

    public Paciente build() {
        Paciente paciente = new Paciente();
        paciente.setNombre(this.nombre);
        paciente.setApellido(this.apellido);
        paciente.setNumeroDocumento(this.numeroDocumento);
        paciente.setTelefono(this.telefono);
        paciente.setGenero(this.genero);
        paciente.setFechaNacimiento(this.fechaNacimiento);
        paciente.setEmail(this.email);
        paciente.setDireccion(this.direccion);
        paciente.setEps(this.eps);
        paciente.setEstado(this.estado);
        return paciente;
    }
}