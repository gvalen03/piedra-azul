# Guía de uso de GitHub Projects — Piedra Azul

## 1. Introducción

El proyecto **Piedra Azul** utiliza GitHub Projects como herramienta de planificación, organización y seguimiento de las actividades de desarrollo.

El tablero **Piedra Azul — Gestión de desarrollo** permite al equipo administrar los Issues del Sprint 2, consultar las responsabilidades de cada integrante, registrar avances y dar seguimiento al cumplimiento de los requisitos establecidos.

Esta guía describe el procedimiento que deben seguir los integrantes para gestionar sus tareas, desarrollar funcionalidades y participar en el proceso de revisión e integración de cambios.

**Enlaces del proyecto:**

- **Repositorio:** [gvalen03/piedra-azul](https://github.com/gvalen03/piedra-azul)
- **Tablero de gestión:** [Piedra Azul — Gestión de desarrollo](https://github.com/users/gvalen03/projects/1)

## 2. Acceso al tablero

El tablero está vinculado al repositorio oficial de Piedra Azul y puede consultarse desde la pestaña **Projects** de GitHub.

Para ingresar:

1. Iniciar sesión en GitHub con la cuenta autorizada.
2. Acceder al repositorio `gvalen03/piedra-azul`.
3. Seleccionar la pestaña **Projects**.
4. Abrir **Piedra Azul — Gestión de desarrollo**.

El Project tiene visibilidad **privada**, por lo que solo pueden acceder los integrantes autorizados.

Cada colaborador dispone de permisos para consultar y actualizar las tareas del tablero, de acuerdo con el rol asignado.

## 3. Integrantes y permisos

El equipo está conformado por cuatro integrantes que participan en la implementación, verificación y documentación del proyecto.

| Usuario de GitHub | Función |
|---|---|
| `gvalen03` | Propietario del repositorio y administrador del Project |
| `miguelperez80` | Colaborador con permiso Write |
| `CarlosMartinez258` | Colaborador con permiso Write |
| `krzo` (nombre visible: Karzozy) | Colaborador con permiso Write |

La identidad de la cuenta `krzo` fue comprobada mediante su identificador de GitHub. Corresponde al colaborador registrado con el ID `170581390`.

Los permisos del repositorio y los del Project se administran de manera independiente. En consecuencia, cada integrante debe contar con acceso a ambos espacios para trabajar con normalidad.

**Responsabilidades de los integrantes:**

- Consultar las tareas que les fueron asignadas.
- Mantener actualizado el estado de sus actividades.
- Registrar los avances y dificultades encontrados.
- Cumplir los criterios de aceptación establecidos.
- Presentar las evidencias y pruebas correspondientes.
- Participar en la revisión de cambios cuando sean designados.

## 4. Organización del tablero

El GitHub Project está organizado en tres vistas principales.

### 4.1. Sprint 2

Contiene las tareas comprometidas para la segunda iteración de desarrollo.

Cada Issue representa una actividad relacionada con requisitos funcionales, seguridad, pruebas, arquitectura o documentación.

Los integrantes deben consultar esta vista para identificar sus responsabilidades y mantener actualizado el avance del sprint.

### 4.2. Product Backlog

Agrupa las actividades identificadas que no forman parte del alcance comprometido del Sprint 2.

Actualmente incluye:

- **ADM-01 (#26):** desactivación de registros con validaciones de dependencias.
- **ADM-02 (#27):** eliminación física controlada de registros.

Estas actividades permanecen en el backlog hasta que el equipo determine su incorporación a una iteración posterior.

### 4.3. Cronograma

Permite visualizar la planificación temporal de las tareas mediante sus fechas objetivo.

El campo **Fecha objetivo** se utiliza como referencia para el seguimiento de los compromisos. La configuración de este campo en la vista Cronograma debe terminar de guardarse y verificarse.

### 4.4. Estados de las tareas

| Estado | Significado |
|---|---|
| **Backlog** | Actividad registrada para una futura iteración. |
| **Por hacer** | Tarea asignada que todavía no ha comenzado. |
| **En progreso** | Actividad en desarrollo por el responsable. |
| **En revisión** | Trabajo implementado y pendiente de revisión o aprobación. |
| **Finalizado** | Actividad validada e integrada conforme a los criterios establecidos. |

Cada integrante debe actualizar el estado de sus tareas para reflejar su progreso real.

## 5. Consulta de tareas asignadas

Para visualizar las actividades propias:

1. Ingresar a la vista **Sprint 2**.
2. Abrir las opciones de filtrado.
3. Seleccionar el campo **Assignees**.
4. Escoger el usuario de GitHub correspondiente.

También es posible utilizar filtros como:

```text
assignee:gvalen03
assignee:miguelperez80
assignee:CarlosMartinez258
assignee:krzo
```

Los Issues también pueden consultarse directamente desde la pestaña **Issues** del repositorio.

Antes de comenzar una tarea, cada integrante debe revisar su descripción, prioridad, criterios de aceptación, dependencias y responsable de revisión.

## 6. Inicio y desarrollo de una tarea

Para garantizar la organización del trabajo, todas las funcionalidades deben desarrollarse mediante ramas independientes.

### Paso 1. Seleccionar el Issue

Identificar la tarea asignada y revisar los resultados esperados.

### Paso 2. Actualizar su estado

Cambiar el estado de **Por hacer** a **En progreso** cuando se inicie el desarrollo.

### Paso 3. Preparar la rama

Actualizar la rama local `dev` y crear una rama específica para la actividad.

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feature/nombre-de-la-tarea
```

Ejemplos utilizados en Piedra Azul:

```text
feature/RF-03-admin-disponibilidad
feature/RF-05-consultar-citas-cedula
```

Si la rama ya existe, debe utilizarse la existente en lugar de crear una duplicada.

### Paso 4. Implementar la funcionalidad

Realizar únicamente los cambios correspondientes al Issue, respetando la arquitectura y las convenciones del repositorio.

### Paso 5. Ejecutar pruebas

Comprobar el funcionamiento de la implementación mediante pruebas automatizadas y, cuando corresponda, pruebas funcionales.

### Paso 6. Documentar los resultados

Registrar los cambios, las verificaciones realizadas, las evidencias y las limitaciones encontradas.

## 7. Seguimiento de criterios de aceptación

Cada Issue incluye criterios de aceptación que permiten verificar el cumplimiento de la actividad.

Estos criterios pueden representarse mediante listas de verificación de Markdown:

```markdown
- [ ] Funcionalidad implementada.
- [ ] Validaciones comprobadas.
- [ ] Pruebas ejecutadas satisfactoriamente.
- [ ] Evidencias documentadas.
```

Cuando un criterio se cumple y ha sido verificado, puede marcarse:

```markdown
- [x] Funcionalidad implementada.
```

**Importante:** marcar una casilla no significa que la tarea haya finalizado. El Issue debe cumplir todos los criterios de aceptación y superar el proceso de revisión correspondiente.

Cuando exista alguna dificultad o dependencia, el responsable debe registrarla en el Issue para facilitar su seguimiento.

## 8. Creación y revisión de Pull Requests

Una vez completada la implementación y ejecutadas las pruebas, el responsable debe preparar los cambios para su integración.

### Paso 1. Registrar los cambios

Crear commits descriptivos que reflejen el trabajo realizado.

Ejemplo:

```bash
git add ruta/del/archivo
git commit -m "feat(disponibilidad): implementar configuración administrativa"
```

### Paso 2. Publicar la rama

```bash
git push -u origin nombre-de-la-rama
```

### Paso 3. Crear el Pull Request

Desde GitHub, abrir un Pull Request con las siguientes ramas:

- **Base:** `dev`
- **Compare:** rama de la funcionalidad desarrollada.

La descripción del PR debe incluir:

- Issue relacionado.
- Resumen de los cambios.
- Criterios de aceptación cumplidos.
- Pruebas ejecutadas y resultados.
- Evidencias disponibles.
- Limitaciones o aspectos pendientes.

### Paso 4. Solicitar revisión

El PR debe ser revisado por un integrante diferente de su autor.

Durante la revisión se verifica que los cambios cumplan los requisitos, mantengan la calidad del código y no afecten otras funcionalidades.

### Paso 5. Integrar los cambios

Una vez aprobado el PR y satisfechas las verificaciones establecidas, los cambios pueden integrarse a `dev`.

Las funcionalidades no deben integrarse directamente a `main`.

## 9. Finalización de una tarea

Una tarea puede pasar al estado **Finalizado** cuando se cumplen las siguientes condiciones:

- Todos sus criterios de aceptación están satisfechos.
- La implementación funciona según lo esperado.
- Las pruebas correspondientes fueron ejecutadas y documentadas.
- Las evidencias técnicas están disponibles.
- El Pull Request fue revisado y aprobado.
- Los cambios fueron integrados correctamente a `dev`.

Después de verificar estas condiciones, se actualiza el estado del Issue y se realiza su cierre conforme al procedimiento del equipo.

Actualmente, el Project no tiene habilitadas las automatizaciones de cierre y actualización por Pull Requests. Por ello, el equipo debe mantener manualmente el estado de las tareas.

## 10. Buenas prácticas de colaboración

Para mantener un proceso de desarrollo organizado, todos los integrantes deben seguir estas recomendaciones:

1. **Respetar las asignaciones:** cada integrante debe trabajar principalmente sobre los Issues que tiene asignados.
2. **Utilizar ramas independientes:** evitar cambios directos sobre `main` y `dev`.
3. **Mantener los cambios relacionados:** cada Pull Request debe abordar una funcionalidad o actividad claramente definida.
4. **Verificar antes de integrar:** ejecutar pruebas y revisar los cambios antes de solicitar un Pull Request.
5. **Registrar evidencias:** documentar resultados relevantes para la sustentación y el documento de arquitectura.
6. **Actualizar el tablero:** reflejar el avance real de las tareas para facilitar el seguimiento del Sprint 2.
7. **Comunicar bloqueos:** informar oportunamente cuando una actividad dependa del trabajo de otro integrante.
8. **Proteger los cambios locales:** comprobar el estado de Git antes de cambiar de rama o ejecutar operaciones que modifiquen el historial.
9. **Participar en las revisiones:** responder observaciones y realizar las correcciones solicitadas.
10. **Mantener la trazabilidad:** relacionar Issues, commits y Pull Requests para facilitar la identificación de cada contribución.

---

## Consideraciones finales

GitHub Projects constituye el principal mecanismo de seguimiento del trabajo del equipo durante el Sprint 2 de Piedra Azul.

Su utilización permite conocer las responsabilidades individuales, identificar actividades pendientes, registrar avances y verificar el cumplimiento de los compromisos adquiridos.

Cada integrante es responsable de mantener actualizadas sus tareas y proporcionar evidencias verificables de su trabajo.

**El cumplimiento de este flujo facilita la colaboración, la revisión del código y la entrega organizada de los resultados del proyecto.**