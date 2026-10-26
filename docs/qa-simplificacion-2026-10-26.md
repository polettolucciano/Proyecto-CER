# Simplificación operativa CER — 26/10/2026

## Alcance
- Inicio de Administración con resumen del centro, responsables y observaciones de los últimos 30 días.
- Inicio de Enfermería con tareas asignadas y registros propios. El historial general conserva el alcance de módulos existente.
- Menú principal por perfil; herramientas adicionales accesibles mediante un desplegable.
- Formulario de una pantalla; identificación compacta cuando se inicia desde una tarea/equipo; secciones opcionales desplegables.
- Historial con registros vigentes por defecto y filtros adicionales para fechas y versiones.
- Programa anual concentrado en Informes; Agenda conserva lista y calendario.

## Evidencia ejecutada
- `npm run build`: correcto, incluye TypeScript. Aviso existente por tamaño del archivo separado de ExcelJS.
- `npm run test -- src/features/records/domain/recordValidation.test.ts src/features/records/recordIntegrity.test.ts src/features/records/application/registerRecord.test.ts src/domain.test.ts`: 4 archivos, 15 tests aprobados.
- `git diff --check`: correcto.
- Navegador real a 1440/1280 px y móvil a 390 px.
- Registro de grupo electrógeno desde tarea: identificación preparada y verificaciones disponibles directamente.
- Guardado incompleto: se solicita el primer control faltante y recibe foco.
- Valor MAL: impide guardar sin observaciones.
- Cierre con cambios: ofrece continuar y conserva el borrador.
- Guardado completo: aparece en historial y actualiza la planificación; persiste al recargar el navegador local.
- Rectificación: conserva valores anteriores, crea nueva revisión y preserva el original.
- Cambio a Enfermería: muestra tareas asignadas, registros propios y menú compacto.
- Ósmosis en móvil: registro completo con sección Mixer; valor conservado al plegar y desplegar; guardado correcto.
- Filtros avanzados: abrir/cerrar, indicador de filtro activo y limpieza.
- Cambio de módulo con datos: confirmación antes de descartar; cancelar conserva los valores.
- Loop: controles START/STOP y desinfección disponibles.
- Calendario: 42 celdas visibles y acceso único al programa anual.
- Exportación del programa anual: archivo descargado `CER-programa-mantenimiento-2026.xlsx`.
- Consola de la sesión revisada: sin errores ni advertencias.

## Límites
- Solo frontend con almacenamiento en este navegador; no hay autenticación ni autorización de servidor.
- No se cambiaron los campos ni obligatoriedad de los procedimientos; separación por turno/procedimiento pendiente de CER.
- Se mantuvo Supervisor para conservar perfiles existentes; su uso sigue sin confirmar.
- No se realizó una nueva prueba de subida de fotos ni una auditoría de seguridad general.
- La sesión local de QA contiene dos registros explícitamente identificados como PRUEBA QA y una rectificación demostrativa. No son mantenimientos reales.
- Sin publicación a producción en esta etapa.

## Recuperación
Referencia previa a los cambios: `codex/before-simplified-workflows-2026-10-26`.
