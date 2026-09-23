package com.piedraazul.mshistorial.repository;

import com.piedraazul.mshistorial.model.HistorialClinico;
import com.piedraazul.mshistorial.model.TipoRegistro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistorialRepository extends JpaRepository<HistorialClinico, Long> {

    List<HistorialClinico> findByPacienteId(Long pacienteId);

    List<HistorialClinico> findByMedicoId(Long medicoId);

    List<HistorialClinico> findByCitaId(Long citaId);

    List<HistorialClinico> findByPacienteIdAndTipoRegistro(
            Long pacienteId, TipoRegistro tipoRegistro);
}