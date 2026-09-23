package com.piedraazul.msauditoria.repository;

import com.piedraazul.msauditoria.model.RegistroAuditoria;
import com.piedraazul.msauditoria.model.TipoEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditoriaRepository extends JpaRepository<RegistroAuditoria, Long> {

    List<RegistroAuditoria> findByTipoEvento(TipoEvento tipoEvento);

    List<RegistroAuditoria> findByRealizadoPor(String realizadoPor);

    List<RegistroAuditoria> findByMicroservicioOrigen(String microservicioOrigen);

    List<RegistroAuditoria> findByFechaEventoBetween(
            LocalDateTime inicio, LocalDateTime fin);

    List<RegistroAuditoria> findByEntidadId(Long entidadId);
}
