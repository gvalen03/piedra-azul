# Guía de uso de GitHub Projects — Piedra Azul

## 1. Introducción

El GitHub Project **Piedra Azul — Gestión de desarrollo** organiza el trabajo del Sprint 2 y el Product Backlog. El equipo lo usa para consultar responsables, prioridades, fechas, dependencias, criterios de aceptación y avance de los Issues.

- Repositorio: [gvalen03/piedra-azul](https://github.com/gvalen03/piedra-azul)
- Project: [Piedra Azul — Gestión de desarrollo](https://github.com/users/gvalen03/projects/1)

## 2. Acceso al tablero

El Project es **privado** y requiere acceso concedido a la cuenta de GitHub de cada integrante. Según la confirmación visual del propietario, el Project está asociado al repositorio `gvalen03/piedra-azul` y ese repositorio es el predeterminado. Se puede abrir desde la pestaña **Projects** del repositorio o usando el enlace directo de arriba.

La guía se actualizó con esa confirmación del propietario. En esta sesión `gh auth status` siguió indicando que el token local de `gvalen03` es inválido, así que no pude volver a consultar la configuración por API.

## 3. Integrantes y permisos

Los permisos del repositorio y los del Project son independientes: tener acceso a uno no concede automáticamente el mismo rol en el otro. Los permisos de repositorio determinan qué acciones se pueden hacer en el código y sus Issues/PR; el rol del Project permite consultar y editar el tablero según el nivel concedido.

Según la revisión visual que informó el propietario, `CarlosMartinez258` y `miguelperez80` tienen **Write** en el Project. También aparece una fila con inicio de sesión `krzo`, nombre visible `Karzozy` y rol **Write**. No se debe asumir que `krzo` y `Karzozy` son la misma cuenta: el nombre visible no confirma el login ni el ID de la cuenta. Esa identidad requiere verificación antes de atribuirle el acceso al integrante esperado o modificarlo. El acceso al repositorio de cada integrante no se confirmó en esta revisión.

`gvalen03` es propietario del Project. No compartas tokens ni credenciales en Issues, PR o documentos.

## 4. Organización del tablero

El Project tiene tres vistas:

- **Sprint 2**: trabajo comprometido para el sprint.
- **Product Backlog**: trabajo futuro aún no comprometido en el sprint.
- **Cronograma**: seguimiento de objetivos por fecha.

Los campos disponibles incluyen **Assignees** (responsable), **Status** (estado), **Prioridad**, **Sprint**, **Fecha objetivo**, **Estimación (puntos)**, **Módulo**, **Épica**, **Bloqueado**, **Dependencias** y progreso de sub-issues.

Los estados configurados son **Backlog**, **Por hacer**, **En progreso**, **En revisión** y **Finalizado**. En la última inspección directa disponible, Sprint 2 tenía 17 Issues y Product Backlog no mostraba elementos; los Issues #26 y #27 no aparecían en esa vista. La confirmación posterior del vínculo y el acceso no incluyó el contenido de las vistas, por lo que hace falta comprobar que #26 (ADM-01) y #27 (ADM-02) ya estén en Product Backlog. Tampoco pude reconfirmar si Cronograma usa **Fecha objetivo**.

No se cambian fechas: si un Issue no tiene fecha objetivo definida, debe permanecer sin fecha hasta que el equipo la acuerde.

## 5. Cómo consultar las tareas asignadas

En las vistas del Project, usa el filtro de **Assignees** y selecciona tu cuenta. También puedes filtrar por texto, por ejemplo:

```text
assignee:gvalen03
assignee:miguelperez80
assignee:CarlosMartinez258
```

Para la persona cuyo nombre visible es Karzozy, confirma primero el login exacto: actualmente la fila reportada muestra `krzo`, que no coincide con el usuario esperado `Karzozy`.

En la pestaña **Issues** del repositorio puedes usar la búsqueda `is:issue is:open assignee:USUARIO`, sustituyendo `USUARIO` por tu login. `assignee:@me` filtra las tareas asignadas a la cuenta con la que has iniciado sesión.

## 6. Cómo comenzar una tarea

1. Abre el Issue asignado y lee su descripción, criterios de aceptación, dependencias y Definition of Done.
2. Si el trabajo está comprometido y vas a iniciarlo, cambia **Status** a **En progreso**.
3. Actualiza tu rama local `dev` y crea una rama `feature` desde ella. Ejemplos de nombres, sin crear ramas aquí:
   - `feature/RF-03-admin-disponibilidad`
   - `feature/RF-05-consultar-citas-cedula`
4. Implementa el alcance del Issue sin mezclar requisitos no relacionados.
5. Ejecuta las pruebas pertinentes y registra comandos, resultados y limitaciones reales.
6. Actualiza la documentación o evidencia que corresponda al cambio.

## 7. Cómo marcar criterios cumplidos

Los criterios de aceptación suelen estar escritos como casillas Markdown:

- `[ ]` significa pendiente.
- `[x]` significa completado.

Marca una casilla únicamente cuando hayas comprobado el criterio y puedas señalar evidencia, por ejemplo una prueba automatizada, una prueba manual reproducible o documentación técnica. No cambies el alcance del criterio para poder marcarlo.

## 8. Cómo enviar una tarea a revisión

1. Crea commits descriptivos en tu rama siguiendo las convenciones del repositorio.
2. Publica la rama en GitHub.
3. Abre un Pull Request con destino a `dev`; no propongas integración directa a `main`.
4. Relaciona el PR con su Issue mediante **Development → Link a pull request** o una referencia explícita en la descripción.
5. Solicita revisión a otro integrante y responde a sus comentarios.
6. Cuando el PR esté listo para revisión, cambia el estado del Issue a **En revisión**. Si se solicitan cambios, mantenlo en revisión hasta publicar las correcciones y actualizar la solicitud.

No dependas de palabras clave como `Closes #N` para cerrar Issues mediante un PR hacia `dev`: la rama predeterminada es `main` y las palabras clave de cierre se aplican al integrar en la rama predeterminada. Consulta la documentación de GitHub sobre [vincular un Pull Request con un Issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue).

## 9. Cuándo marcar una tarea como Finalizado

Marca **Finalizado** solo cuando:

- Se cumplan todos los criterios de aceptación.
- Se hayan ejecutado las pruebas pertinentes y sus resultados estén registrados.
- La evidencia y documentación estén actualizadas.
- Otro integrante haya revisado y aprobado el Pull Request.
- El PR se haya integrado correctamente en `dev`.

Completar las casillas de aceptación no cierra automáticamente el Issue. No cierres el Issue antes de completar la revisión y la integración. La última configuración comprobada tenía deshabilitadas las automatizaciones **Auto-close issue**, **Item closed**, **Pull request linked to issue** y **Pull request merged**; la única habilitada observada era **Auto-add sub-issues to project**. No se cambiaron automatizaciones y su estado actual requiere reconfirmación.

## 10. Buenas prácticas de colaboración

- No trabajes directamente sobre `main` ni `dev`; usa una rama de trabajo basada en `dev`.
- Coordina antes de modificar archivos o Issues asignados a otra persona.
- Mantén cada Issue relacionado con sus ramas y Pull Requests.
- Procura que un PR cubra un requisito o conjunto de cambios estrechamente relacionado.
- Conserva tus cambios locales: revisa `git status` antes de cambiar de rama y protege cambios que deban acompañarte.
- No cierres Issues antes de la aprobación e integración del PR.
- Registra bloqueos, dependencias y decisiones en el Issue para que el equipo pueda darles seguimiento.
- Actualiza el estado del tablero cuando cambie realmente el avance; no marques progreso por trabajo aún no verificado.

## Verificaciones pendientes

La asociación del Project al repositorio, el repositorio predeterminado, la visibilidad privada y los roles de `CarlosMartinez258`, `miguelperez80` y la fila `krzo`/`Karzozy` se basan en la confirmación visual del propietario. Falta verificar directamente la identidad exacta de esa fila, los permisos de repositorio, la presencia de #26 y #27 en Product Backlog, la selección de **Fecha objetivo** en Cronograma y el estado actual de las automatizaciones. No se modificaron permisos, Issues, vistas, campos ni automatizaciones al preparar esta guía.
