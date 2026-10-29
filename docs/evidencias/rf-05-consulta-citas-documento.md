**EVIDENCIA TÉCNICA — RF-05: CONSULTA DE CITAS POR DOCUMENTO**

**Proyecto:** Piedra Azul  
**Requisito funcional:** RF-05 — Consultar citas de paciente por cédula  
**Issue:** [#17 — RF-05](https://github.com/gvalen03/piedra-azul/issues/17)  
**Responsable:** gvalen03  
**Fecha de verificación:** 28 de octubre de 2026  
**Rama:** `feature/RF-05-consultar-citas-cedula`

---

**1. Descripción del requisito**

El requisito funcional RF-05 permite que los usuarios con rol de **Agendador** o **Médico/Terapista** consulten las citas de un paciente mediante su número de documento de identificación.

La consulta presenta las citas registradas, tanto pasadas como futuras, junto con su fecha, horario, estado y profesional asignado.

El acceso a esta información está controlado según el rol del usuario. Los médicos y terapistas únicamente pueden consultar las citas asociadas a su propio perfil, mientras que los agendadores pueden consultar las citas de los pacientes sin esa restricción.

La funcionalidad está orientada exclusivamente a la consulta de citas y no permite acceder a diagnósticos, tratamientos ni información de la historia clínica.

**2. Implementación realizada**

La funcionalidad se desarrolló respetando la arquitectura de monolito modular utilizada en Piedra Azul, mediante la integración del backend Fastify, la base de datos PostgreSQL y el frontend SolidJS.

**Backend**

Se implementó el endpoint:

`GET /api/historial/pacientes/:documento/citas`

Este servicio permite consultar las citas correspondientes a un documento de identificación y aplica las siguientes reglas:

- Requiere que el usuario esté autenticado.
- Autoriza únicamente a los roles `AGENDADOR` y `MEDICO_TERAPISTA`.
- Restringe las consultas de los médicos y terapistas a sus propias citas.
- Utiliza coincidencia exacta del documento mediante consultas SQL parametrizadas.
- Incluye citas pasadas y futuras, independientemente de su estado.
- Devuelve únicamente los datos necesarios para visualizar las citas.
- Cuando no se encuentran registros, responde con una lista vacía sin exponer información adicional del paciente.

La implementación reutiliza los mecanismos de autenticación y autorización existentes, sin modificar su funcionamiento central.

**Frontend**

Se desarrolló el componente `ConsultaCitasPaciente.jsx`, reutilizado en los paneles de Agendador y Médico/Terapista.

La interfaz permite ingresar el documento de identificación, realizar la consulta y visualizar los resultados encontrados.

También contempla los casos en los que el documento es inválido, no existen citas registradas o se presenta un error durante la solicitud.

**3. Arquitectura de la solución**

La consulta sigue el flujo de comunicación establecido en la arquitectura del proyecto:

**Interfaz SolidJS** → **Ruta Fastify** → **Servicio de aplicación** → **Repositorio** → **PostgreSQL**

Cada componente cumple una responsabilidad específica:

| Componente | Responsabilidad |
|---|---|
| `ConsultaCitasPaciente.jsx` | Capturar el documento y presentar los resultados. |
| `historial.routes.js` | Recibir la solicitud y aplicar los controles de acceso. |
| `historial.service.js` | Coordinar las reglas de negocio de la consulta. |
| `historial.repository.js` | Ejecutar la consulta parametrizada y aplicar el filtro del médico. |
| PostgreSQL | Almacenar la información de pacientes, citas y médicos. |

La implementación permanece dentro del módulo `historial` y no modifica la lógica de administración y reprogramación de citas desarrollada por otros integrantes.

**4. Validaciones de seguridad**

Se incorporaron controles para garantizar que la consulta sea segura y respete los permisos definidos en el sistema.

- **Autenticación:** se exige una sesión válida antes de permitir el acceso.
- **Autorización:** únicamente los roles habilitados pueden utilizar el servicio.
- **Restricción por profesional:** el identificador del médico se obtiene del usuario autenticado y no de un valor proporcionado por el cliente.
- **Prevención de inyección SQL:** se utilizan parámetros en las consultas a la base de datos.
- **Protección de datos:** las respuestas excluyen diagnósticos, tratamientos, controles y demás información clínica.
- **Validación de entradas:** se comprueba el documento recibido y se controlan las consultas sin resultados.

Estas reglas se verificaron mediante pruebas automatizadas, aunque todavía está pendiente su comprobación integral con servicios reales.

**5. Archivos desarrollados o modificados**

| Área | Archivos |
|---|---|
| Backend | `historial.routes.js`, `historial.service.js`, `historial.repository.js`, `historial.schema.js` |
| Frontend | `ConsultaCitasPaciente.jsx`, `consulta-citas.css`, `CitasPage.jsx`, `MedicoPage.jsx` |
| Pruebas | `historial.consulta.test.js` |
| Documentación | `rf-05-consulta-citas-documento.md` |

**6. Pruebas realizadas y resultados**

Se ejecutaron pruebas automatizadas para comprobar la funcionalidad, las restricciones de acceso, las validaciones y la estructura de las respuestas.

| Prueba | Resultado |
|---|---|
| Pruebas específicas de Historial y RF-05 | **17 de 17 aprobadas** |
| Compilación del frontend con Vite | **Exitosa** |
| Suite completa del backend | 83 aprobadas y 8 fallidas, de 91 |
| Verificación `git diff --check` | Sin errores |
| Integración con PostgreSQL real | Pendiente |
| Prueba funcional completa de la interfaz | Pendiente |
| Validación con Keycloak | Pendiente |

Las pruebas específicas comprobaron la búsqueda exacta por documento, el tratamiento de resultados vacíos, los parámetros inválidos, las restricciones por rol, el aislamiento de las consultas del médico y la exclusión de información clínica.

La suite general del backend presenta ocho pruebas fallidas que también se reprodujeron sobre la versión base anterior a RF-05. Estas corresponden a seis pruebas de reprogramación y actualización de citas, una prueba de agenda médica y una del portal del paciente.

Por tanto, las fallas identificadas no se atribuyen a los cambios implementados en RF-05 y deberán atenderse dentro de las actividades de pruebas generales del proyecto.

**7. Limitaciones y verificaciones pendientes**

Aunque las pruebas automatizadas específicas fueron satisfactorias, no fue posible completar la validación con todos los servicios reales.

**PostgreSQL:** la instancia local en `127.0.0.1:5432` no respondió. Por esta razón, no se ejecutaron consultas sobre una base de pruebas con información sintética.

**Docker:** el servicio no estaba disponible en el entorno utilizado, por lo que no fue posible iniciar una instancia aislada de PostgreSQL mediante contenedores.

**Interfaz:** no se ejecutó un recorrido funcional completo con los usuarios Agendador y Médico/Terapista conectados a una base de datos real.

**Keycloak:** la integración con este proveedor de autenticación todavía no estaba presente en la versión revisada del proyecto. Las validaciones de autorización se realizaron utilizando los mecanismos existentes y pruebas controladas.

Para completar la verificación integral será necesario comprobar el funcionamiento de RF-05 en un entorno de pruebas con PostgreSQL, validar la consulta desde ambos paneles y verificar su compatibilidad con Keycloak una vez que esté integrado.

**8. Estado del requisito**

RF-05 cuenta con su implementación de backend y frontend, pruebas automatizadas específicas satisfactorias y documentación técnica de los cambios realizados.

La funcionalidad se encuentra **lista para revisión de código**, pero todavía tiene verificaciones de integración pendientes.

Se recomienda conservar el Issue #17 abierto hasta completar las pruebas con los servicios correspondientes, obtener la aprobación del Pull Request y realizar la integración a la rama `dev`.

**Conclusión**

La implementación de RF-05 permite consultar las citas de un paciente mediante su documento de identificación, aplicando restricciones de acceso por rol y limitando la información presentada a los datos necesarios.

Las pruebas automatizadas realizadas respaldan el funcionamiento de las reglas implementadas. No obstante, la validación completa deberá finalizarse cuando estén disponibles PostgreSQL y la integración de autenticación requerida para el proyecto.