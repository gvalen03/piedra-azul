# Prueba de usabilidad - Sprint 2

**Proyecto:** Piedra Azul  
**Versión evaluada:** ____________________  
**Fecha de las sesiones:** ____________________  
**Moderador(a):** ____________________  
**Estado:** Protocolo preparado; los resultados se diligencian únicamente después de realizar las sesiones.

## 1. Objetivo

Evaluar si los flujos principales del Sistema de Reserva de Citas Piedra Azul se entienden y pueden completarse sin asistencia significativa. La prueba cubre las funcionalidades implementadas en el Sprint 2:

- Consultar agenda diaria por médico/terapista.
- Registrar y agendar una cita como paciente.
- Configurar disponibilidad como administrador.
- Exportar citas por fecha y profesional en CSV.
- Consultar citas de un paciente por documento como Agendador o Médico/Terapista.

## 2. Método y participantes

Se recomienda una prueba moderada, presencial o remota, con **tres a cinco participantes** que no hayan construido el flujo que van a probar. Pueden usarse compañeros de clase como usuarios de prueba, siempre que se registre su rol simulado y no se publiquen nombres, correos, documentos ni capturas con datos personales.

| Participante | Rol simulado | Experiencia previa con agendas web | Fecha | Consentimiento verbal |
|---|---|---|---|---|
| P1 | ____________________ | Baja / Media / Alta | __________ | Sí / No |
| P2 | ____________________ | Baja / Media / Alta | __________ | Sí / No |
| P3 | ____________________ | Baja / Media / Alta | __________ | Sí / No |

Antes de iniciar, explicar: “Estamos evaluando el sistema, no a ti. Puedes detenerte en cualquier momento. No se recopilarán datos personales; usaremos cuentas y datos sintéticos.”

## 3. Ambiente de prueba

- URL del frontend: ____________________
- URL/API del backend: ____________________
- Navegador y versión: ____________________
- Datos de prueba: usuarios, pacientes, documentos y citas exclusivamente sintéticos.
- Duración estimada por sesión: 20 a 25 minutos.
- Materiales: dispositivo del participante, hoja de registro, cronómetro y, si existe autorización, grabación de pantalla sin datos personales.

## 4. Guion para el moderador

1. Dar la bienvenida, solicitar consentimiento y aclarar que no existen respuestas correctas.
2. Pedir al participante que piense en voz alta: qué espera que ocurra, qué busca y qué le genera duda.
3. Leer una tarea a la vez; no indicar botones ni rutas.
4. Si el participante se bloquea, esperar al menos 60 segundos antes de registrar asistencia.
5. Al terminar, aplicar el cuestionario breve y preguntar qué cambiaría primero.

## 5. Tareas y criterios de éxito

| ID | Rol | Instrucción para el participante | Éxito observable | Límite sugerido |
|---|---|---|---|---|
| T1 | Agendador | “Consulta la agenda del profesional indicado para la fecha indicada.” | Filtra por profesional y fecha; identifica cantidad, horario y estado de las citas. | 3 min |
| T2 | Paciente | “Agenda una cita disponible para el profesional y fecha indicados.” | Selecciona una franja disponible y recibe confirmación sin enviar datos de otro paciente. | 4 min |
| T3 | Administrador | “Configura la disponibilidad semanal del profesional con la ventana y el intervalo indicados.” | Guarda una disponibilidad válida y reconoce la confirmación o mensaje de validación. | 4 min |
| T4 | Médico/Terapista o Agendador | “Exporta las citas del profesional para la fecha indicada.” | Descarga un CSV y reconoce fecha, horario, paciente y estado. | 3 min |
| T5 | Agendador | “Busca las citas del paciente cuyo documento te entregaron.” | Encuentra solo las citas del documento sintético; comprende el estado vacío si no hay citas. | 3 min |
| T6 | Médico/Terapista | “Consulta las citas del mismo paciente.” | Comprende que los resultados están restringidos a su perfil y no muestran información clínica. | 3 min |

## 6. Registro por tarea

Completar una fila por participante y tarea. “Con ayuda” incluye una pista del moderador; “No completada” incluye abandono, error no recuperable o superar el límite.

| Participante | Tarea | Resultado (Sin ayuda / Con ayuda / No completada) | Tiempo | Errores, dudas o pasos inesperados | Observación textual relevante |
|---|---|---|---|---|---|
| ____ | T1 | ____________________ | ______ | ____________________ | ____________________ |
| ____ | T2 | ____________________ | ______ | ____________________ | ____________________ |
| ____ | T3 | ____________________ | ______ | ____________________ | ____________________ |
| ____ | T4 | ____________________ | ______ | ____________________ | ____________________ |
| ____ | T5 | ____________________ | ______ | ____________________ | ____________________ |
| ____ | T6 | ____________________ | ______ | ____________________ | ____________________ |

## 7. Cuestionario posterior

Solicitar una valoración de 1 a 5, donde 1 significa “totalmente en desacuerdo” y 5 “totalmente de acuerdo”.

| Pregunta | P1 | P2 | P3 | Promedio |
|---|---:|---:|---:|---:|
| Entendí qué podía hacer en cada pantalla. | ___ | ___ | ___ | ___ |
| Encontré los botones o acciones que necesitaba. | ___ | ___ | ___ | ___ |
| Los mensajes de error o confirmación fueron claros. | ___ | ___ | ___ | ___ |
| Me sentí seguro(a) al completar las tareas. | ___ | ___ | ___ | ___ |
| Usaría este sistema para gestionar citas. | ___ | ___ | ___ | ___ |

Preguntas abiertas:

- ¿Qué fue lo más fácil? ________________________________________________
- ¿Qué fue lo más confuso o difícil? ______________________________________
- Si pudieras cambiar una cosa, ¿cuál sería? ______________________________

## 8. Criterios de interpretación

- **Eficacia:** porcentaje de tareas completadas sin ayuda. Meta sugerida: 80% o superior.
- **Eficiencia:** comparar el tiempo observado con el límite sugerido; no usar el tiempo como único criterio si el participante leyó cuidadosamente.
- **Satisfacción:** promedio de las cinco preguntas. Meta sugerida: 4/5 o superior.
- **Problema de usabilidad:** registrar cualquier confusión repetida por dos o más participantes, o un bloqueo que impida completar una tarea.

## 9. Hallazgos y acciones

No registrar hallazgos hasta completar sesiones reales.

| ID | Hallazgo observado | Evidencia (P/Tarea) | Severidad (Alta/Media/Baja) | Acción propuesta | Responsable | Estado |
|---|---|---|---|---|---|---|
| U-01 | ____________________ | ____________________ | ___ | ____________________ | __________ | Pendiente |
| U-02 | ____________________ | ____________________ | ___ | ____________________ | __________ | Pendiente |
| U-03 | ____________________ | ____________________ | ___ | ____________________ | __________ | Pendiente |

## 10. Resumen final

Completar después de las sesiones:

- Participantes evaluados: ______
- Tareas completadas sin ayuda: ______ / ______
- Eficacia: ______ %
- Satisfacción promedio: ______ / 5
- Principales hallazgos: _________________________________________________
- Decisión del equipo: _________________________________________________

**Nota de evidencia:** adjuntar capturas saneadas o una fotografía de la hoja de registro solo si no contienen nombres, documentos, correos, tokens, contraseñas ni información clínica real.
