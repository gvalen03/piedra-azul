package com.piedraazul.mspacientes.repository;

import com.piedraazul.mspacientes.model.EstadoPaciente;
import com.piedraazul.mspacientes.model.Paciente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PacienteRepository extends JpaRepository<Paciente, Long> {

    Optional<Paciente> findByNumeroDocumento(String numeroDocumento);

    Optional<Paciente> findByEmail(String email);

    List<Paciente> findByEstado(EstadoPaciente estado);

    boolean existsByNumeroDocumento(String numeroDocumento);

    boolean existsByEmail(String email);
}