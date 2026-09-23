package com.piedraazul.mshistorial.dto;

import com.piedraazul.mshistorial.model.TipoRegistro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HistorialDTO {

    @NotNull(message = "El paciente es obligatorio")
    private Long pacienteId;

    @NotNull(message = "El médico es obligatorio")
    private Long medicoId;

    @NotNull(message = "La cita es obligatoria")
    private Long citaId;

    @NotNull(message = "El tipo de registro es obligatorio")
    private TipoRegistro tipoRegistro;

    @NotBlank(message = "La descripción es obligatoria")
    private String descripcion;

    private String diagnostico;
    private String tratamiento;

    @NotBlank(message = "El registrador es obligatorio")
    private String registradoPor;
}
