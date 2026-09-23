package com.piedraazul.msauditoria.observer;

import com.piedraazul.msauditoria.model.RegistroAuditoria;
import com.piedraazul.msauditoria.repository.AuditoriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

// Implementación concreta del Observer
// Persiste cada evento en la base de datos
@Slf4j
@Component
@RequiredArgsConstructor
public class AuditoriaObserverImpl implements AuditoriaObserver {

    private final AuditoriaRepository auditoriaRepository;

    @Override
    public void registrarEvento(RegistroAuditoria registro) {
        auditoriaRepository.save(registro);
        log.info("[AUDITORIA] {} | {} | {} | {}",
                registro.getTipoEvento(),
                registro.getMicroservicioOrigen(),
                registro.getRealizadoPor(),
                registro.getFechaEvento());
    }
}