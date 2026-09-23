package com.piedraazul.msauditoria;

import com.piedraazul.msauditoria.model.RegistroAuditoria;
import com.piedraazul.msauditoria.model.TipoEvento;
import com.piedraazul.msauditoria.observer.AuditoriaObserver;
import com.piedraazul.msauditoria.repository.AuditoriaRepository;
import com.piedraazul.msauditoria.service.AuditoriaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuditoriaServiceTest {

    @Mock
    private AuditoriaRepository auditoriaRepository;

    @Mock
    private AuditoriaObserver auditoriaObserver;

    @InjectMocks
    private AuditoriaService auditoriaService;

    // -- Test 1: Observer registra el evento correctamente --
    @Test
    void testRegistrar_ObserverNotificaEvento() {
        RegistroAuditoria registroMock = new RegistroAuditoria();
        registroMock.setId(1L);
        registroMock.setTipoEvento(TipoEvento.CITA_AGENDADA);

        doNothing().when(auditoriaObserver)
                .registrarEvento(any(RegistroAuditoria.class));

        RegistroAuditoria resultado = auditoriaService.registrar(
                TipoEvento.CITA_AGENDADA,
                "Cita agendada correctamente",
                1L,
                "ana@email.com",
                "ms-agenda"
        );

        assertNotNull(resultado);
        assertEquals(TipoEvento.CITA_AGENDADA, resultado.getTipoEvento());
        verify(auditoriaObserver, times(1))
                .registrarEvento(any(RegistroAuditoria.class));
    }

    // -- Test 2: Tipo de evento inválido lanza excepción --
    @Test
    void testListarPorTipo_TipoInvalido_LanzaExcepcion() {
        assertThrows(IllegalArgumentException.class, () ->
                auditoriaService.listarPorTipo("EVENTO_INEXISTENTE"));
    }

    // -- Test 3: Listar todos retorna lista correctamente --
    @Test
    void testListarTodos_RetornaLista() {
        RegistroAuditoria registro = new RegistroAuditoria();
        registro.setTipoEvento(TipoEvento.USUARIO_CREADO);

        when(auditoriaRepository.findAll()).thenReturn(List.of(registro));

        List<RegistroAuditoria> resultado = auditoriaService.listarTodos();

        assertNotNull(resultado);
        assertEquals(1, resultado.size());
        assertEquals(TipoEvento.USUARIO_CREADO, resultado.get(0).getTipoEvento());
    }

    // -- Test 4: Listar por usuario retorna eventos correctamente --
    @Test
    void testListarPorUsuario_RetornaEventosDelUsuario() {
        RegistroAuditoria registro = new RegistroAuditoria();
        registro.setRealizadoPor("admin1");
        registro.setTipoEvento(TipoEvento.LOGIN_EXITOSO);

        when(auditoriaRepository.findByRealizadoPor("admin1"))
                .thenReturn(List.of(registro));

        List<RegistroAuditoria> resultado =
                auditoriaService.listarPorUsuario("admin1");

        assertNotNull(resultado);
        assertEquals(1, resultado.size());
        assertEquals("admin1", resultado.get(0).getRealizadoPor());
    }
}
