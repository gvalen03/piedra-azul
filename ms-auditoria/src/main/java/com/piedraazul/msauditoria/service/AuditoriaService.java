package com.piedraazul.msauditoria.service;

import com.piedraazul.msauditoria.model.RegistroAuditoria;
import com.piedraazul.msauditoria.model.TipoEvento;
import com.piedraazul.msauditoria.observer.AuditoriaObserver;
import com.piedraazul.msauditoria.repository.AuditoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final AuditoriaRepository auditoriaRepository;
    private final AuditoriaObserver auditoriaObserver;

    // -- Registrar evento usando Observer (GoF) --
    public RegistroAuditoria registrar(TipoEvento tipoEvento,
                                       String descripcion,
                                       Long entidadId,
                                       String realizadoPor,
                                       String microservicioOrigen) {
        RegistroAuditoria registro = new RegistroAuditoria();
        registro.setTipoEvento(tipoEvento);
        registro.setDescripcion(descripcion);
        registro.setEntidadId(entidadId);
        registro.setRealizadoPor(realizadoPor);
        registro.setMicroservicioOrigen(microservicioOrigen);
        registro.setFechaEvento(LocalDateTime.now());

        // Observer registra y persiste el evento
        auditoriaObserver.registrarEvento(registro);
        return registro;
    }

    // -- Listar todos los registros --
    public List<RegistroAuditoria> listarTodos() {
        return auditoriaRepository.findAll();
    }

    // -- Listar por tipo de evento --
    public List<RegistroAuditoria> listarPorTipo(String tipoEvento) {
        TipoEvento tipo = TipoEvento.valueOf(tipoEvento.toUpperCase());
        return auditoriaRepository.findByTipoEvento(tipo);
    }

    // -- Listar por usuario --
    public List<RegistroAuditoria> listarPorUsuario(String usuario) {
        return auditoriaRepository.findByRealizadoPor(usuario);
    }

    // -- Listar por microservicio --
    public List<RegistroAuditoria> listarPorMicroservicio(String microservicio) {
        return auditoriaRepository.findByMicroservicioOrigen(microservicio);
    }

    // -- Listar por rango de fechas --
    public List<RegistroAuditoria> listarPorFechas(String inicio, String fin) {
        return auditoriaRepository.findByFechaEventoBetween(
                LocalDateTime.parse(inicio),
                LocalDateTime.parse(fin)
        );
    }
}