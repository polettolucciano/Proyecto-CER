# Revisión de seguridad — mantenimiento, 2026-11-05

Revisión focalizada de los cambios de esta entrega, separada de la QA funcional. No constituye una auditoría externa ni certifica seguridad de producción.

- El nuevo rol Operador no puede administrar ni planificar. La prueba SQL comprueba su aislamiento por módulo y rechazo de comandos administrativos; la UI también oculta esas acciones.
- Los comandos `module` y `cancel-task` pasan por la autorización administrativa del RPC existente. No se agregan escrituras directas desde el cliente.
- El servidor valida responsables activos y acceso al módulo. Los módulos asignados a perfiles deben existir en el catálogo; los nombres no se duplican ignorando mayúsculas.
- Los módulos nuevos reciben un formulario general definido por servidor; no se acepta un formulario arbitrario enviado por el cliente. La edición de un módulo conserva las secciones especializadas existentes.
- La cancelación bloquea la tarea y valida fecha prevista, motivo, alcance y ausencia de registros realizados afectados. El servidor establece autor y fecha, conserva el historial y rechaza alterarlo mediante la edición ordinaria.
- El alta de registros rechaza una fecha cancelada y el avance salta cancelaciones futuras. Las transacciones existentes conservan atomicidad, revisión e idempotencia.
- Las funciones privadas nuevas revocan ejecución de public/anon/authenticated y fijan search_path vacío. Las funciones RPC conservan su control de acceso existente.
- Invitaciones validan el módulo contra el catálogo antes de enviar correo. Evidencias verifican acceso y existencia de módulos personalizados antes de procesar la imagen.
- Biblioteca remota mantiene filtro de publicación; gestión remota se envuelve en AuthGate y exige Administración. En demo, elegir un perfil no equivale a autenticación real y se informa en pantalla.
- No se agregaron secretos, dependencias ni nuevas rutas públicas de lectura de registros. No se aplicaron cambios a base remota ni a backups.

Evidencia: `npm test`, 89 pruebas aprobadas; backend PGlite y handlers locales. Pendiente antes de activar producción con datos reales: aplicar migración y funciones en staging, verificar permisos con sesiones Supabase reales, Storage y concurrencia remota. La nueva unicidad de nombres debe comprobarse contra el catálogo real antes de aplicar la migración; no se renombra ni elimina información automáticamente.
