# Despliegue y reversión

Estado: preparación local. No se modificó Vercel ni se publicaron migraciones.

## Preview primero

1. Completar SETUP_SUPABASE en un servicio de pruebas y validar cuentas/roles.
2. Subir una rama de trabajo solo con autorización. No empujar a main: el proyecto actual de Vercel despliega automáticamente esa rama.
3. En Vercel conservar preset Vite, raíz ./, build npm run build, salida dist. Agregar las tres variables públicas de ENVIRONMENT **solo para Preview**, apuntando a la base de pruebas.
4. Usar una URL de preview estable y exacta en Auth: Site URL y /auth/callback. Ajustar APP_ORIGIN del Edge Function al mismo origen. No permitir indiscriminadamente todos los dominios vercel.app.
5. Confirmar estado conectado, ausencia de selector de roles, almacenamiento en servidor y errores sin fallback demo.
6. Verificar los encabezados definidos en vercel.json y que el callback abra index.html. La CSP admite el dominio estándar de Supabase; un dominio personalizado requiere actualizarla deliberadamente.

## Puerta de producción

- [ ] Matriz de permisos y reglas de tareas aprobadas por CER.
- [ ] Proyecto de producción identificado y autorización expresa de migraciones/despliegue.
- [ ] Auth, correo, recuperación e invitaciones probados en dispositivos distintos.
- [ ] Enfermería no puede administrar, escalar rol, leer otro módulo ni alterar historial.
- [ ] Registros/fotos persisten al cerrar sesión y en otro dispositivo.
- [ ] Conflicto entre dos sesiones y reintento sin duplicación comprobados.
- [ ] Backup SQL y archivos cifrados, monitor y notificaciones activados.
- [ ] Restauración en proyecto aislado comprobada con usuarios, valores, historial y fotos.
- [ ] Riesgos de SECURITY revisados y responsables de soporte/recuperación definidos.
- [ ] Build y QA pertinentes aprobados; no hay secretos en bundle/Git.
- [ ] Variables de producción apuntan únicamente a producción; no se importan seeds.

No marcar un respaldo como recuperable por comprobar únicamente su hash.

## Revertir un frontend defectuoso

Suspender nuevos cambios. Desde Vercel seleccionar un despliegue anterior que sea compatible con el esquema vigente y usar el procedimiento de rollback autorizado. Conservar logs sin secretos y registrar el motivo. Probar login y lectura antes de reabrir escrituras.

Una versión anterior a Supabase abrirá la demo: no es una recuperación operativa válida. Puede servir como mantenimiento/presentación, pero no debe recibir registros reales.

No revertir la base mediante DROP, reset o una migración hacia atrás improvisada. Ante una incompatibilidad, preparar una corrección compatible hacia adelante. Para pérdida de datos: preservar el estado, restaurar primero en pruebas y seguir BACKUPS; producción siempre requiere aprobación y respaldo previo.

## Observabilidad

La aplicación distingue errores de sesión, permisos, validación, conflicto y red. Un guardado fallido mantiene abierto el formulario. Un guardado confirmado cuya recarga falla lo informa sin presentarlo como fracaso de escritura.

Actions reporta fallos y falta de backups recientes. La supervisión central de errores de frontend, el watchdog independiente del scheduler y los avisos operativos de mantenimiento necesitan configurar canales/servicios; no están activos.
