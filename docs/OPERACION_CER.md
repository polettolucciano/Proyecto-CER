# Operar CER sin ser especialista en bases de datos

## Situación actual

Por decisión del responsable del proyecto, la versión para inspeccionar sigue abierta sin ingreso y utiliza **datos de demostración**. No cargar allí registros reales de la clínica. El backend se verificó con cuentas técnicas eliminadas al finalizar; todavía no está habilitado para el personal.

## Incorporar enfermeros cuando se habilite el ingreso

1. Crear el primer administrador mediante el bootstrap de [SETUP_SUPABASE.md](SETUP_SUPABASE.md). La contraseña la establece su titular mediante el flujo de Auth, fuera del código y de GitHub.
2. Con SMTP e invitaciones desplegados y comprobados, Administración → Personas y permisos → Agregar integrante.
3. Ingresar nombre y correo individual; elegir Enfermería y habilitar los módulos que corresponda. CER confirmó que el equipo comparte las tareas: si todos realizan todos los controles, habilitar los mismos módulos a cada uno.
4. Cada persona acepta su propia invitación y configura su contraseña. “Enfermería” es un rol compartido, **no una contraseña común**. Esto permite saber quién hizo cada registro.
5. Probar una cuenta antes de incorporar las demás. Nunca dar rol Administrador por comodidad.

## Administrar permisos

Solo Administración puede modificar perfiles. Desactivar a quien ya no use el sistema; no borrar su identidad ni su historial. Los permisos se verifican en PostgreSQL y Storage, aunque alguien intente llamar a la API directamente. Cambiar un permiso debe comprobarse con esa cuenta y no solo con el menú de Administración.

## Comprobar conexión y guardado

La versión real muestra “Sesión personal · Datos del centro”; la demo muestra “Demostración”. Después de un registro, actualizar la página y consultar el historial por equipo desde otra sesión autorizada. Si falla el guardado, conservar el formulario, leer el aviso y no cerrar la página ni repetir clics rápidamente.

Si aparece que otra persona modificó datos, actualizar la información, revisar el historial y confirmar el formulario antes de intentarlo otra vez. La corrección HTTP de este aviso está preparada en una migración pendiente; no habilitar la operación clínica hasta verificarla remotamente.

## Respaldos y recuperación

Seguir [ACTIVACION_DRIVE.md](ACTIVACION_DRIVE.md). El responsable debe verificar cada día el estado de Actions y las fechas de las copias SQL y fotos. Verde significa que terminó ese proceso, no que ya se probó una recuperación completa. Una ejecución omitida no cuenta como backup.

Ante un incidente: detener nuevas cargas, conservar mensajes y hora del error sin contraseñas, comprobar el estado de Supabase y avisar al responsable técnico. Nunca ejecutar reset, DROP, borrar fotografías o restaurar encima del proyecto activo. Primero recuperar en un entorno aislado y comparar máquinas, usuarios, fechas, historial y fotos.

## Publicar una actualización

Desarrollar en rama, ejecutar las pruebas afectadas, revisar cambios y desplegar una Preview con las variables de su entorno. Verificar allí los flujos modificados. La rama `main` actualiza automáticamente Vercel: subirla solo con autorización expresa. Una Preview real debe exigir ingreso; la demo abierta queda separada.

Conservar compatibilidad entre frontend y migraciones. Un rollback a una versión demo no recupera los registros del servidor. Revisar [DEPLOYMENT.md](DEPLOYMENT.md) antes de actualizar.

## Mantenimiento periódico

- Revisar alertas y copias; mantener una persona responsable de responder.
- Repetir recuperación aislada de forma periódica y después de cambios importantes de esquema.
- Revisar accesos cuando alguien ingresa o se desvincula.
- Revisar actualizaciones de dependencias y límites de Supabase, Drive y Vercel con cambios probados y acotados.
- Conservar la identidad privada de age, la configuración de proveedores y el acceso administrativo en un gestor seguro con recuperación disponible.
