# Mantenimiento — validación del 5 de noviembre de 2026

## Alcance confirmado por el cliente

Fuente: `Mantenimiento.docx`, compartido por el usuario. El usuario confirmó la interpretación de las cinco solicitudes antes de implementar.

1. Poder agregar módulos al selector de mantenimiento. Se administran en Administración → Módulos y se pueden crear mientras se carga un equipo, conservando el borrador. Los módulos nuevos usan un formulario general; los formularios especializados anteriores se conservan.
2. Cancelar un control previsto. Administración elige una fecha o esa fecha y las siguientes, con motivo obligatorio. Se quita de pendientes/calendario, se conserva la programación con sus cancelaciones y los controles realizados. No se borran registros.
3. Abrir controles desde calendario y cronograma anual. Una celda anual abre el período con registros y fechas previstas; un registro abre su detalle y Administración puede acceder a Rectificar. Los registros realizados también aparecen en el calendario.
4. Asignar personas concretas. Responsable del equipo prevalece sobre el predeterminado del módulo; cada control permite elegir otro responsable con acceso. Operador tiene acceso operativo a sus módulos, sin permisos de planificación o administración.
5. Separar capacitaciones de mantenimiento: biblioteca `/capacitaciones`, gestión `/capacitaciones/administrar`, sin entrada duplicada en la navegación de mantenimiento. El acceso anterior `/#training` redirige a la gestión.

## Verificación automática

- `npm test`: 41 pruebas Vitest y 48 pruebas Node, todas aprobadas.
- `npm run build`: aprobado; incluye comprobación de TypeScript. Persiste la advertencia de tamaño del bundle principal y ExcelJS.
- `git diff --check`: aprobado.
- No hay script de lint en el proyecto.
- Backend probado en PostgreSQL embebido PGlite con migraciones, roles y políticas. Incluye módulos dinámicos, permisos de Operador, responsable inválido, cancelación de fecha y serie, idempotencia, autoría, motivo, protección de registros existentes y fin de mes.
- Nuevas programaciones guardan la fecha de inicio para no inventar controles vencidos anteriores a su creación. Se conserva el comportamiento histórico de las programaciones antiguas que carecen de esa fecha.

## Pruebas reales en navegador local

Ejecución con CUA/Playwright, sin inyectar datos por almacenamiento o API; datos ficticios identificados `PRUEBA QA`, en modo demo local.

| Flujo | Resultado observado |
| --- | --- |
| Agregar equipo y crear módulo desde el mismo formulario | Se conservan nombre/código/ubicación y se selecciona el módulo nuevo. |
| Crear Operador con un solo módulo | Solo ve su sector; no accede a Administración ni a Programar control. |
| Configurar responsable del módulo y programar un control | Se propone la persona por su nombre y rol. |
| Configurar responsable diferente del equipo | La ficha del equipo muestra esa persona por encima del predeterminado del módulo. |
| Cancelar una ocurrencia mensual | Desaparece esa fecha; próxima fecha avanza al mes siguiente. Persiste al recargar. |
| Cancelar la serie desde la próxima fecha | Deja de aparecer en pendientes, mantiene fila e historial en cronograma. |
| Intentar confirmar sin motivo | Validación nativa impide guardar: «Completa este campo». |
| Realizar control único como Operador | Registro con campos generales y autoría correcta; deja de estar pendiente. |
| Calendario de realizados | Evento verde abre el registro real; filtro Realizados cuenta los del mes. |
| Celda NOV del cronograma | Abre el período; registro enlazado abre el detalle. Administrador ve Rectificar/Anular; Operador no. |
| Consultar celda de una programación cancelada | Se ven motivos, fechas y Administración como autora de ambas cancelaciones. |
| Móvil 390×844 | Calendario en agenda, filtros y navegación sin desborde horizontal del documento (scrollWidth 390). |
| Escritorio 1100×860 | Catálogo de módulos y ficha sin desborde del documento (scrollWidth 1100). |
| Biblioteca pública y gestión separada | Ambas rutas cargan; formulario de gestión conserva módulo/submódulo. Sin menú de mantenimiento en gestión. |
| Acceso antiguo /#training | Redirige a /capacitaciones/administrar. |
| Consola local | Sin errores capturados al consultar los flujos finales. |

Evidencia: `output/playwright/mantenimiento-2026-11-05/` contiene calendario móvil, catálogo en escritorio y cancelación auditada.

## Límites de la entrega

La publicación sigue en modo demostración: IndexedDB del navegador. Los datos ficticios de QA quedan solamente en el navegador local de pruebas. No se afirma persistencia compartida, autorización real ni trazabilidad de servidor para la demo.

La migración `20261105174159_maintenance_administration.sql` y los cambios de funciones `cer-invite`/`cer-evidence` están versionados y probados localmente. **No se aplicaron ni desplegaron en Supabase remoto**. Para usar estas capacidades con datos reales deben desplegarse en un entorno revisado, probarse allí con Auth/Storage reales y habilitarse el modo remoto posteriormente. No se modificó la configuración de backups.

No se simularon sesiones remotas expiradas, correos reales, caída real de red ni subida de evidencia a Storage en esta ronda. Las pruebas locales de handlers cubren validación previa, autorización y módulos dinámicos.
