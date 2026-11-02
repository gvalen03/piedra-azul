# QA-01 y QA-02 — Validación del backend, Sprint 2

**Proyecto:** Piedra Azul — Ingeniería de Software III 2026.2  
**Fecha de verificación registrada:** 02-nov-2026  
**Rama de trabajo:** `test/QA-01-QA-02-validacion-sprint2` (base `dev`)  
**Issues:** [QA-01 #20](https://github.com/gvalen03/piedra-azul/issues/20) · [QA-02 #21](https://github.com/gvalen03/piedra-azul/issues/21)

## QA-01 — Matriz inicial de cobertura

La matriz se construyó a partir del inventario local de archivos `src/modules/**/{domain,application}/*.js`, los 14 archivos `*.test.js` encontrados y las importaciones que estos declaran. **Una importación no equivale por sí sola a cobertura completa.** Las pruebas de rutas con servicios o repositorios simulados tampoco acreditan persistencia real. La calificación «parcial/por revisar» significa que hay pruebas relacionadas pero falta una comprobación exhaustiva por método y caso límite.

| Módulo | Elementos de dominio y aplicación inventariados (sin archivos `.test.js`) | Pruebas existentes relacionadas | Estado de cobertura demostrado |
|---|---|---|---|
| Administración | `AdminService` | `test/admin.module.test.js` | Pruebas relacionadas con servicio, administración y autorización; falta matriz de métodos/invariantes |
| Auditoría | `AuditoriaService`, `Auditoria`, `tipo-evento` | `test/auditoria.repository.test.js` | Se comprobó uso de `AuditoriaRepository`; pruebas directas de servicio y entidad **no identificadas** |
| Autenticación | `AuthService`, `Usuario`, `UsuarioFactory`, `rol` | `src/modules/auth/application/auth.service.test.js`, `src/modules/auth/domain/usuario.factory.test.js`, `src/modules/auth/web/auth.controller.test.js`, `test/auth.login.test.js` | Pruebas directas de `AuthService` y `UsuarioFactory`, uso de `Usuario`; cobertura completa de entidad y reglas por verificar |
| Citas | `CitaService`, `Cita`, `estado-cita`, `cita-creada.event` | `src/modules/citas/application/cita.service.test.js`, `test/agendador.module.test.js`, `test/medico.agenda.test.js`, `test/paciente.portal.test.js`, `test/disponibilidad.flujo.test.js` | Pruebas directas de servicio y pruebas relacionadas con repositorio/rutas; entidad, estados y evento sin prueba directa identificada |
| Disponibilidad | `DisponibilidadService`, `dia-semana`, `Disponibilidad`, `franja-horaria` | `src/modules/disponibilidad/application/disponibilidad.service.test.js`, `test/disponibilidad.flujo.test.js` | Pruebas directas de servicio; invariantes de entidad, día y franja requieren contraste específico |
| Historial clínico | `HistorialService`, `ControlMedico`, `HistoriaClinica`, `tipo-control`, `control-medico-creado.event` | `test/historial.module.test.js` | Pruebas relacionadas con servicio, repositorio y rutas; cobertura directa de las entidades y evento no identificada |
| Médicos | `MedicoService`, `Medico` | `test/medico.agenda.test.js` | **Sin pruebas directas identificadas** de `MedicoService` y `Medico`; el archivo existente verifica agenda/rutas y `CitaRepository` |
| Pacientes | `PacienteService`, `estado-paciente`, `genero`, `PacienteBuilder`, `Paciente`, `PacienteFactory`, `paciente-creado.event` | `test/paciente.module.test.js`, `test/paciente.portal.test.js`, `test/agendador.module.test.js` | Pruebas directas relacionadas con `PacienteFactory` y `PacienteService`; constructor/builder, entidades, tipos y evento por verificar |

**Totales del inventario:** 14 archivos de prueba (5 en `src/modules/`, 9 en `test/`). Se encontraron 31 archivos bajo `domain`/`application`, de los cuales 4 eran archivos `.test.js`; por tanto, **27 archivos de implementación** en esas capas. Los 14 tests incluyen también `auth.controller.test.js`, ubicado en `web`.

### Pendientes y responsabilidades de QA-01

1. Revisar con cada responsable de módulo si las entidades y servicios indicados como no demostrados tienen pruebas propias de éxito, casos inválidos, invariantes y límites.
2. Añadir pruebas unitarias faltantes en los módulos de sus respectivos responsables; no inventariar mocks de rutas como pruebas reales de base de datos.
3. Completar los enlaces a los PR técnicos de cada integrante y la revisión cruzada.
4. Ejecutar también un smoke build del frontend y registrar su salida para el cierre del Issue #20.

**Estado de QA-01:** matriz inicial documentada; no se declara cobertura completa ni cierre de los criterios de aceptación.

## QA-02 — Correcciones de pruebas desfasadas

### Diagnóstico

Al ejecutar `cd backend && npm test`, la suite presentó **76 aprobadas y 7 fallidas** en la primera revisión local de esta sesión de trabajo. Las fallas se concentraron en los archivos `agendador.module.test.js` y `medico.agenda.test.js`; la prueba de `paciente.portal.test.js` ya se había corregido en la rama RF02. Al trasladar las correcciones a una rama nueva basada en `dev`, reapareció el fallo del portal hasta aplicar allí el mismo ajuste.

Las diferencias se originaban en pruebas que exigían un formato literal del SQL, mientras que las consultas reales contienen indentación, espacios alrededor de `=` y saltos de línea. En el mock de agenda, el uso de `sql.startsWith(...)` tampoco reconocía sentencias con indentación inicial. **No se modificó código de producción.**

| Archivo | Ajustes realizados | Propósito conservado |
|---|---|---|
| `backend/test/agendador.module.test.js` | Uso de `trimStart().startsWith(...)` para reconocer consultas `SELECT` y `UPDATE`; expresiones regulares tolerantes al espacio para estado y comparación temporal | Seguir verificando reprogramación, validación de estados, horarios, rollback y auditoría |
| `backend/test/medico.agenda.test.js` | Regex tolerante a espacios/saltos de línea entre filtros `c.medico_id = $1` y `c.fecha = $2` | Seguir comprobando que se filtra por médico y fecha con parámetros SQL |
| `backend/test/paciente.portal.test.js` | Regex tolerantes a espacios y saltos de línea en propietario, zona horaria y condiciones de estado | Seguir comprobando actualización atómica limitada a paciente, fecha y estado |

### Ejecuciones observadas

| Verificación | Resultado |
|---|---|
| `node --test test/agendador.module.test.js` | **9/9 aprobadas** |
| `node --test test/medico.agenda.test.js` | **5/5 aprobadas** |
| `node --test test/paciente.portal.test.js` | **8/8 aprobadas** |
| `npm test` en rama `test/QA-01-QA-02-validacion-sprint2`, con los tres archivos ajustados | **83 pruebas, 83 aprobadas, 0 fallidas, 0 omitidas**; duración reportada 1361,6086 ms |
| `git diff --check` antes de la última limpieza de punto y coma | Sin observaciones |
| `git diff --stat` antes de la última limpieza | Tres archivos de pruebas; 10 inserciones y 10 eliminaciones |

**Pendiente de verificar para QA-02:** ejecutar el smoke `npm run build` en `frontend` según el Issue #21, confirmar la última limpieza del diff, documentar el commit definitivo y adjuntar evidencia del flujo funcional/API si corresponde. La suite es una comprobación automatizada; **no sustituye una prueba E2E con PostgreSQL real**.

### Consideración de integración con RF02

`backend/test/paciente.portal.test.js` incluye correcciones también incorporadas en el PR **#34 (RF02)**. Al integrar los PR, revisar su orden y resolver la coincidencia sin duplicar cambios innecesarios. No se afirma que RF02 esté ya integrado en `dev`.

## Estado de entrega

- **QA-01 (#20):** inventario y matriz inicial realizados; quedan brechas de cobertura y revisión por los responsables.
- **QA-02 (#21):** pruebas del backend en verde localmente; faltan verificación de build, integración del PR y revisión cruzada.
- **Publicación:** pendiente de commit, push, PR y revisión. No se marcan los issues como terminados antes de cumplir su Definition of Done.
