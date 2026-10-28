# Enfermería compartida — 28/10/2026

Alcance: un único perfil operativo de demostración, controles compartidos e interfaz sin selector de sede. No se modificaron cuentas reales, RLS ni migraciones. La identidad del autor de cada registro se conserva. El campo interno de asignación de tareas se mantiene por compatibilidad con el esquema existente; la interfaz presenta el trabajo como responsabilidad del equipo.

Verificaciones ejecutadas:
- TypeScript: correcto.
- Vitest: pruebas de dominio y normalización correctas; nueva prueba de acceso de demo sin pérdida de autores o asignaciones históricas.
- Build de producción: correcto; conserva aviso de tamaño de los paquetes existentes.
- Navegador en modo demo: un único botón de Enfermería, controles de todos los módulos, calendario exclusivo, detalle de tarea y apertura del formulario de grupo electrógeno.
- Administración: edición y guardado de una tarea existente sin selector individual; confirmación de guardado visible.
- Móvil de 390 × 844: calendario visible y ancho del documento sin desborde. Consola sin errores capturados durante el recorrido.

La prueba de interfaz se realizó con datos locales de demostración. No acredita configuración de cuentas ni permisos de un entorno real. Se preservaron las identidades históricas de las demostraciones anteriores.
