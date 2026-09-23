package com.piedraazul.mshistorial.service;

import com.piedraazul.mshistorial.dto.HistorialDTO;
import com.piedraazul.mshistorial.event.HistorialModificadoEvent;
import com.piedraazul.mshistorial.model.*;
import com.piedraazul.mshistorial.repository.CambioAgendaRepository;
import com.piedraazul.mshistorial.repository.HistorialRepository;
import com.piedraazul.mshistorial.service.CitaClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HistorialService {

    private final HistorialRepository historialRepository;
    private final CambioAgendaRepository cambioAgendaRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final CitaClientService citaClientService;

    // -- Registrar entrada en historial clínico --
    public HistorialClinico registrar(HistorialDTO dto) {

        // Verifica que la cita existe en ms-agenda
        if (!citaClientService.existeCita(dto.getCitaId())) {
            throw new RuntimeException(
                    "Cita no encontrada en el sistema: " + dto.getCitaId());
        }

        HistorialClinico historial = new HistorialClinico();
        historial.setPacienteId(dto.getPacienteId());
        historial.setMedicoId(dto.getMedicoId());
        historial.setCitaId(dto.getCitaId());
        historial.setTipoRegistro(dto.getTipoRegistro());
        historial.setDescripcion(dto.getDescripcion());
        historial.setDiagnostico(dto.getDiagnostico());
        historial.setTratamiento(dto.getTratamiento());
        historial.setRegistradoPor(dto.getRegistradoPor());
        historial.setFechaRegistro(LocalDateTime.now());

        HistorialClinico guardado = historialRepository.save(historial);

        // Patrón Observer — notifica a ms-auditoria
        eventPublisher.publishEvent(new HistorialModificadoEvent(
                guardado.getId(),
                guardado.getPacienteId(),
                guardado.getMedicoId(),
                "CREACION",
                guardado.getRegistradoPor(),
                LocalDateTime.now()
        ));

        return guardado;
    }

    // -- Registrar reagendamiento usando Memento (GoF) --
    // Guarda el estado anterior antes de cambiar la cita
    public CambioAgenda registrarReagendamiento(Long citaId,
                                                Long pacienteId,
                                                Long medicoId,
                                                LocalDateTime fechaAnterior,
                                                LocalDateTime fechaNueva,
                                                String motivoCambio,
                                                String cambiadoPor) {
        // Patrón Memento — captura el estado anterior
        CitaMemento memento = new CitaMemento(
                citaId,
                pacienteId,
                medicoId,
                fechaAnterior,
                "PROGRAMADA"
        );

        // Persiste el cambio usando el Memento
        CambioAgenda cambio = new CambioAgenda();
        cambio.setCitaId(memento.getCitaId());
        cambio.setPacienteId(memento.getPacienteId());
        cambio.setMedicoId(memento.getMedicoId());
        cambio.setFechaHoraAnterior(memento.getFechaHoraAnterior());
        cambio.setFechaHoraNueva(fechaNueva);
        cambio.setMotivoCambio(motivoCambio);
        cambio.setCambiadoPor(cambiadoPor);
        cambio.setFechaCambio(LocalDateTime.now());

        CambioAgenda guardado = cambioAgendaRepository.save(cambio);

        // Patrón Observer — notifica a ms-auditoria
        eventPublisher.publishEvent(new HistorialModificadoEvent(
                guardado.getId(),
                pacienteId,
                medicoId,
                "REAGENDAMIENTO",
                cambiadoPor,
                LocalDateTime.now()
        ));

        return guardado;
    }

    // -- Consultar historial por paciente --
    public List<HistorialClinico> listarPorPaciente(Long pacienteId) {
        return historialRepository.findByPacienteId(pacienteId);
    }

    // -- Consultar historial por cita --
    public List<HistorialClinico> listarPorCita(Long citaId) {
        return historialRepository.findByCitaId(citaId);
    }

    // -- Consultar cambios de agenda por cita --
    public List<CambioAgenda> listarCambiosPorCita(Long citaId) {
        return cambioAgendaRepository.findByCitaId(citaId);
    }

    // -- Consultar cambios de agenda por paciente --
    public List<CambioAgenda> listarCambiosPorPaciente(Long pacienteId) {
        return cambioAgendaRepository.findByPacienteId(pacienteId);
    }
}
