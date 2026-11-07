
# PLAN-01 - Aclaración de requisitos del segundo corte

**Proyecto:** Piedra Azul

**Asignatura:** Ingeniería de Software III - 2026.2

**Sprint:** 2

**Responsable en GitHub:** CarlosMartinez258

**Issue:** [#9 - PLAN-01](https://github.com/gvalen03/piedra-azul/issues/9)

**Estado:** Revisión documental realizada. Pendiente revisión cruzada.

## 1. Objetivo

Revisar los requisitos funcionales del segundo corte del proyecto Piedra Azul, comparando las indicaciones publicadas por el profesor en Classroom con el documento oficial de entregables.

Se busca identificar posibles diferencias entre las fuentes, registrar las decisiones adoptadas para la planificación del Sprint 2 y mantener el alcance de los cinco requisitos funcionales obligatorios.

## 2. Fuentes de información

Para realizar esta revisión se utilizaron las siguientes fuentes:

1. **Publicación de Classroom:** actividad correspondiente a la segunda entrega del proyecto de Ingeniería de Software III, período 2026.2.
2. **Documento oficial:** `EntregablesSegundoCorte2026.2-IngSoft3(1).pdf`, especialmente las páginas 1 a 4.
3. **GitHub Project:** Piedra Azul - Gestión de desarrollo, Sprint 2.
4. **GitHub Issue #9:** PLAN-01 - Aclarar RF heredados y criterios con PDF/docente.

## 3. Clasificación de los requisitos funcionales

En la publicación de Classroom se indica que el segundo corte comprende cinco requisitos funcionales: tres provenientes del primer corte y dos nuevos, relacionados con la exportación y consulta de citas.

Para la planificación del Sprint 2 se adopta la siguiente clasificación:

| Código | Requisito funcional | Clasificación |
|---|---|---|
| RF-01 | Listar las citas médicas de un médico o terapista en una fecha determinada, mostrando el listado y la cantidad de citas. | Heredado del primer corte |
| RF-02 | Permitir que un paciente registrado agende una cita desde la web, consultando las franjas disponibles de cada profesional. | Heredado del primer corte |
| RF-03 | Permitir al administrador configurar los días, horarios, intervalos y ventana de disponibilidad de médicos y terapistas. | Heredado del primer corte, según la interpretación adoptada de Classroom |
| RF-04 | Exportar las citas de un médico o terapista en una fecha específica a un formato compatible con hojas de cálculo, como CSV. | Nuevo del segundo corte |
| RF-05 | Consultar las citas de un paciente a partir de su documento de identificación. | Nuevo del segundo corte |

Esta clasificación se utiliza para organizar el trabajo del equipo. No modifica las funcionalidades ni elimina ningún requisito.

## 4. Matriz de ambigüedades y decisiones

| ID | Asunto | Fuente y ubicación | Pregunta o diferencia identificada | Decisión o estado |
|---|---|---|---|---|
| A-01 | Requisitos heredados | Classroom, descripción de la actividad; PDF, página 1, apartado Entregables | Classroom indica tres requisitos heredados, pero el PDF menciona expresamente los requisitos 1 y 2. ¿RF-03 también pertenece al primer corte? | Se adopta provisionalmente la distribución de Classroom: RF-01, RF-02 y RF-03 heredados; RF-04 y RF-05 nuevos. Pendiente de confirmación formal del docente. |
| A-02 | Identificación de la asignatura | Classroom y encabezados del PDF, páginas 1 a 4 | El documento contiene referencias tanto a Ingeniería de Software II como a Ingeniería de Software III. ¿Cuál denominación corresponde a la entrega? | Se utiliza Ingeniería de Software III, período 2026.2, según la actividad publicada para el curso. |
| A-03 | Identificación del período | Classroom y título interior del PDF, página 1 | El PDF presenta referencias a 2026.1 y 2026.2. ¿Cuál corresponde a la segunda entrega actual? | Se utiliza 2026.2 para identificar el trabajo, conservando constancia de la diferencia documental. |
| A-04 | Evidencia de planificación del sprint | PDF, página 3, protocolo de sustentación, punto 5; página 4, documento de arquitectura | El protocolo menciona el primer sprint, mientras que el documento de arquitectura solicita una captura de planificación del Sprint 2. ¿Qué evidencia debe presentarse? | Se prepara evidencia del Sprint 2, correspondiente a la entrega actual. La diferencia queda registrada para revisión. |

## 5. Alcance acordado para el Sprint 2

A partir de las instrucciones revisadas se establecen los siguientes criterios de trabajo:

- Mantener los cinco requisitos funcionales RF-01 a RF-05.
- Considerar RF-01, RF-02 y RF-03 como requisitos heredados para la organización de esta iteración, siguiendo la publicación de Classroom.
- Considerar RF-04 y RF-05 como los dos requisitos funcionales nuevos.
- Mantener los criterios de aceptación definidos en los Issues de GitHub para cada funcionalidad.
- Implementar y verificar los requisitos no funcionales de seguridad establecidos por el profesor.
- Mantener la trazabilidad entre requisitos, implementación, pruebas y documentación de arquitectura.
- Registrar las diferencias documentales sin afirmar que el profesor las ha resuelto cuando no existe evidencia de ello.

## 6. Requisitos no funcionales considerados

La revisión también identifica los siguientes requisitos no funcionales del documento oficial:

1. Implementar autenticación y autorización mediante tokens JWT y un sistema externo como Keycloak.
2. Evaluar al menos dos vulnerabilidades de la aplicación mediante OWASP ZAP, siguiendo la clasificación OWASP Top 10, y generar el informe correspondiente.

Estos requisitos forman parte del alcance del segundo corte y serán desarrollados y verificados mediante las tareas asignadas al equipo.

## 7. Evidencias de la revisión

Se identificaron como fuentes de respaldo:

- Publicación del profesor en Classroom sobre la segunda entrega.
- Documento oficial de entregables del segundo corte.
- Issue #9 de GitHub, con su descripción y criterios de aceptación.
- Tablero de planificación del Sprint 2.

La comparación anterior constituye la revisión documental inicial. No representa una respuesta formal del docente ni una aprobación de los demás integrantes.

## 8. Actividades pendientes

Para completar los criterios establecidos en PLAN-01 se requiere:

- [ ] Obtener y registrar la revisión cruzada de dos integrantes, según lo exigido en el Issue.
- [ ] Registrar una eventual aclaración formal del profesor o mantener expresamente las interpretaciones provisionales.
- [ ] Incorporar las decisiones revisadas en la matriz correspondiente y en la documentación final de arquitectura.
- [ ] Vincular el Pull Request de este documento con el Issue #9.
- [ ] Integrar la contribución en la rama `dev` después de la revisión del equipo.

## 9. Conclusión

La revisión permitió identificar diferencias entre la publicación de Classroom y el PDF oficial, especialmente en la cantidad de requisitos heredados y en algunas referencias del curso y del sprint.

Para continuar con el desarrollo se adopta la distribución de tres requisitos heredados y dos nuevos, manteniendo los cinco requisitos funcionales obligatorios.

Las diferencias quedan documentadas y las interpretaciones que requieren confirmación se conservan como provisionales. De esta manera, el equipo puede continuar el Sprint 2 sin modificar el alcance del proyecto ni presentar decisiones pendientes como aprobaciones oficiales.
