package com.piedraazul.msauditoria.observer;

import com.piedraazul.msauditoria.model.RegistroAuditoria;

// ══════════════════════════════════════════════════════
// PATRÓN GOF: OBSERVER
// Propósito: definir una interfaz para que cualquier
// componente pueda observar y registrar eventos
// del sistema sin acoplarse al origen del evento.
// EP-08 — HU-11, HU-12
// ══════════════════════════════════════════════════════
public interface AuditoriaObserver {
    void registrarEvento(RegistroAuditoria registro);
}