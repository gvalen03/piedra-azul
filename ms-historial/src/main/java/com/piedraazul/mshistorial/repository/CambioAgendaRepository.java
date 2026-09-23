package com.piedraazul.mshistorial.repository;

import com.piedraazul.mshistorial.model.CambioAgenda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CambioAgendaRepository extends JpaRepository<CambioAgenda, Long> {

    List<CambioAgenda> findByCitaId(Long citaId);

    List<CambioAgenda> findByPacienteId(Long pacienteId);

    List<CambioAgenda> findByMedicoId(Long medicoId);
}