package com.piedraazul.ui.historial;

import javafx.beans.property.LongProperty;
import javafx.beans.property.SimpleLongProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.beans.property.StringProperty;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class HistorialEntry {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final LongProperty id;
    private final LongProperty pacienteId;
    private final LongProperty medicoId;
    private final LongProperty citaId;
    private final StringProperty tipoRegistro;
    private final StringProperty descripcion;
    private final StringProperty fechaRegistro;
    private final StringProperty registradoPor;

    public HistorialEntry(long id,
                          long pacienteId,
                          long medicoId,
                          long citaId,
                          String tipoRegistro,
                          String descripcion,
                          LocalDateTime fechaRegistro,
                          String registradoPor) {
        this.id = new SimpleLongProperty(id);
        this.pacienteId = new SimpleLongProperty(pacienteId);
        this.medicoId = new SimpleLongProperty(medicoId);
        this.citaId = new SimpleLongProperty(citaId);
        this.tipoRegistro = new SimpleStringProperty(tipoRegistro);
        this.descripcion = new SimpleStringProperty(descripcion);
        this.fechaRegistro = new SimpleStringProperty(
                fechaRegistro != null ? fechaRegistro.format(DATE_FORMATTER) : "");
        this.registradoPor = new SimpleStringProperty(registradoPor);
    }

    public LongProperty idProperty() { return id; }
    public LongProperty pacienteIdProperty() { return pacienteId; }
    public LongProperty medicoIdProperty() { return medicoId; }
    public LongProperty citaIdProperty() { return citaId; }
    public StringProperty tipoRegistroProperty() { return tipoRegistro; }
    public StringProperty descripcionProperty() { return descripcion; }
    public StringProperty fechaRegistroProperty() { return fechaRegistro; }
    public StringProperty registradoPorProperty() { return registradoPor; }

    public boolean matches(String query) {
        String lower = query.toLowerCase();
        return tipoRegistro.get().toLowerCase().contains(lower)
                || descripcion.get().toLowerCase().contains(lower)
                || registradoPor.get().toLowerCase().contains(lower)
                || fechaRegistro.get().toLowerCase().contains(lower);
    }
}
