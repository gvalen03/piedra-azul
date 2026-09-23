package com.piedraazul.mshistorial;

import com.piedraazul.mshistorial.model.CambioAgenda;
import com.piedraazul.mshistorial.model.CitaMemento;
import com.piedraazul.mshistorial.model.HistorialClinico;
import com.piedraazul.mshistorial.model.TipoRegistro;
import com.piedraazul.mshistorial.repository.CambioAgendaRepository;
import com.piedraazul.mshistorial.repository.HistorialRepository;
import com.piedraazul.mshistorial.service.CitaClientService;
import com.piedraazul.mshistorial.service.HistorialService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HistorialServiceTest {

    @Mock
    private HistorialRepository historialRepository;

    @Mock
    private CambioAgendaRepository cambioAgendaRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private CitaClientService citaClientService;

    @InjectMocks
    private HistorialService historialService;

    // -- Test 1: Memento guarda estado anterior correctamente --
    @Test
    void testMemento_GuardaEstadoAnterior() {
        LocalDateTime fechaAnterior = LocalDateTime.of(2026, 5, 27, 8, 30);
        LocalDateTime fechaNueva = LocalDateTime.of(2026, 5, 28, 10, 0);

        CitaMemento memento = new CitaMemento(
                1L, 1L, 1L, fechaAnterior, "PROGRAMADA");

        assertEquals(1L, memento.getCitaId());
        assertEquals(fechaAnterior, memento.getFechaHoraAnterior());
        assertEquals("PROGRAMADA", memento.getEstado());
        assertNotNull(memento.getFechaCaptura());
    }

    // -- Test 2: Reagendamiento persiste el cambio --
    @Test
    void testRegistrarReagendamiento_PersisteCambio() {
        LocalDateTime fechaAnterior = LocalDateTime.of(2026, 5, 27, 8, 30);
        LocalDateTime fechaNueva = LocalDateTime.of(2026, 5, 28, 10, 0);

        CambioAgenda cambioMock = new CambioAgenda();
        cambioMock.setId(1L);
        cambioMock.setCitaId(1L);
        cambioMock.setFechaHoraAnterior(fechaAnterior);
        cambioMock.setFechaHoraNueva(fechaNueva);

        when(cambioAgendaRepository.save(any(CambioAgenda.class)))
                .thenReturn(cambioMock);

        CambioAgenda resultado = historialService.registrarReagendamiento(
                1L, 1L, 1L, fechaAnterior, fechaNueva,
                "Paciente no puede asistir", "admin1");

        assertNotNull(resultado);
        assertEquals(fechaAnterior, resultado.getFechaHoraAnterior());
        assertEquals(fechaNueva, resultado.getFechaHoraNueva());
        verify(cambioAgendaRepository, times(1)).save(any(CambioAgenda.class));
    }

    // -- Test 3: Listar cambios por cita --
    @Test
    void testListarCambiosPorCita_RetornaLista() {
        CambioAgenda cambio = new CambioAgenda();
        cambio.setCitaId(1L);

        when(cambioAgendaRepository.findByCitaId(1L))
                .thenReturn(List.of(cambio));

        List<CambioAgenda> resultado =
                historialService.listarCambiosPorCita(1L);

        assertNotNull(resultado);
        assertEquals(1, resultado.size());
    }

    // -- Test 4: Cita no encontrada lanza excepción en historial --
    @Test
    void testRegistrar_CitaNoExiste_LanzaExcepcion() {
        when(citaClientService.existeCita(99L)).thenReturn(false);

        var dto = new com.piedraazul.mshistorial.dto.HistorialDTO();
        dto.setPacienteId(1L);
        dto.setMedicoId(1L);
        dto.setCitaId(99L);
        dto.setTipoRegistro(TipoRegistro.CONSULTA);
        dto.setDescripcion("Consulta de prueba");
        dto.setRegistradoPor("drcarlos");

        assertThrows(RuntimeException.class, () ->
                historialService.registrar(dto));
    }
}