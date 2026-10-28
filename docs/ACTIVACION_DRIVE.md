# Activar los respaldos en Google Drive personal

Este procedimiento todavía no se ejecutó. La web de inspección continúa sin ingreso y con datos de demostración. Ninguna credencial se pega en el chat ni se sube a Git.

## 1. Autorizar Google una sola vez

En una computadora confiable instalar `rclone` y `age` desde sus distribuciones oficiales. La generación automática posterior ocurre en GitHub, aunque esta computadora esté apagada.

1. Ejecutar `rclone config`.
2. Crear un remote llamado `cer`, de tipo Google Drive.
3. Elegir el alcance `drive.file`: solo archivos creados o abiertos por esta aplicación. Usar el navegador propio para autorizar la cuenta personal. No hacer pública la carpeta.
4. Se puede usar el cliente OAuth incorporado de rclone. Si se elige un cliente propio, habilitar Google Drive API, crear cliente OAuth de escritorio y sacar la aplicación del modo Testing; ese modo puede hacer caducar el refresh token. Ingresar sus credenciales únicamente en rclone.
5. Crear el árbol con la misma aplicación autorizada:

```bash
rclone mkdir 'cer:Backups CER/Diarios'
rclone mkdir 'cer:Backups CER/Mensuales'
rclone mkdir 'cer:Backups CER/Archivos/Diarios'
rclone mkdir 'cer:Backups CER/Archivos/Mensuales'
rclone mkdir 'cer:Backups CER/Registros-de-verificacion'
```

Verificar estas carpetas desde Drive sin cambiar sus permisos. `drive.file` no equivale a credenciales separadas de lectura y borrado: usar environments protegidos en GitHub para la rotación.

## 2. Guardar la clave de recuperación

En una carpeta privada **fuera de Proyecto CER**:

```bash
age-keygen -o age-identity.txt
```

Guardar `age-identity.txt` en un gestor seguro y una copia offline. El destinatario público `age1…` se usa para cifrar; la identidad privada nunca va en GitHub Actions. Perderla significa perder la posibilidad de recuperar las copias.

## 3. Configurar GitHub

En `polettolucciano/Proyecto-CER` → Settings → Environments, crear `cer-backups`, `cer-backups-monitor` y `cer-backup-rotation`. Proteger rotación con aprobación y restringir el código que recibe secretos a la rama revisada `main`. No activar mientras esa rama no contenga los scripts revisados.

En Settings → Secrets and variables → Actions, crear las variables de repositorio:

| Variable | Valor inicial |
|---|---|
| CER_SOURCE_PROJECT_REF | pnqsvmtmkceznoswpgfz |
| CER_BACKUP_REMOTE | cer:Backups CER |
| CER_BACKUP_AGE_RECIPIENT | El destinatario público age |
| CER_BACKUPS_ENABLED | false |
| CER_STORAGE_BACKUP_ENABLED | false |
| CER_BACKUP_ROTATION_ENABLED | false |
| CER_RESTORE_TESTED | false |

En `cer-backups`: guardar `CER_BACKUP_DATABASE_URL` obtenida en Supabase Connect, con TLS `sslmode=require` y contraseña correctamente codificada. Guardar la configuración privada de rclone en `RCLONE_CONFIG_CREATE`. La ubicación local se consulta con `rclone config file`; copiar su contenido directamente a GitHub, sin enviarlo por chat.

En `cer-backups-monitor`: `RCLONE_CONFIG_READ`. En `cer-backup-rotation`: `RCLONE_CONFIG_ROTATE`. Para Drive personal esas configuraciones pueden corresponder al mismo OAuth; el control de borrado depende del environment protegido. No declarar aislamiento de credenciales que Google no ofrece.

Para fotos, configurar un remote S3 de solo lectura del bucket privado `cer-evidence`, añadirlo junto al destino Drive en `RCLONE_CONFIG_STORAGE` del environment `cer-backups` y definir `CER_STORAGE_REMOTE`. No usar una clave privilegiada en la web. Las credenciales de Storage se obtienen privadamente en Supabase; su configuración y acceso todavía deben verificarse.

## 4. Primera ejecución y evidencia

1. Con los scripts revisados en `main`, activar **solo** `CER_BACKUPS_ENABLED=true`.
2. Actions → CER backups → Run workflow. Revisar que el job `generate` termine correctamente y que en Drive existan el `.tar.gz.age` y su manifiesto `.json` del mismo momento.
3. Configurar y activar Storage, ejecutar CER Storage backup y comprobar su propio archivo y manifiesto. Una copia SQL no contiene los bytes de las fotos.
4. Ejecutar CER backup freshness. Debe comprobar antigüedad y volver a leer los bytes cifrados. No considerar una ejecución “skipped” como verificación satisfactoria.
5. En GitHub → Settings → Notifications, activar avisos de Actions fallidos para el responsable. Para un canal adicional, configurar `CER_ALERT_WEBHOOK` directamente en cada environment que deba enviar avisos. Probar el canal deliberadamente antes de depender de él. Un fallo del scheduler de GitHub requiere vigilancia independiente; no se configuró un watchdog externo.
6. Conservar fecha, ejecución de Actions y manifiestos como evidencia. No activar borrado todavía.

Los horarios preparados son 03:17 de Argentina para SQL, 03:47 para archivos y un monitor cada seis horas. GitHub puede retrasar ejecuciones.

## 5. Recuperar sin tocar producción

1. Ejecutar `node scripts/backups/backup.mjs list` con la configuración privada de rclone y las variables de ENVIRONMENT. Elegir el nombre exacto por fecha, no “el último” a ciegas.
2. Descargar el `.age` y su `.json` a una carpeta privada fuera del repositorio mediante `rclone copyto`. Descargar también el respaldo independiente de `Archivos` que corresponda al periodo. Para una recuperación completa, debe contener todas las rutas que usa el SQL elegido.
3. Crear un proyecto Supabase de recuperación vacío, distinto del activo, y preparar las variables de restauración de [ENVIRONMENT.md](ENVIRONMENT.md). Se requieren `psql`, `age`, `tar` y `rclone`. No reutilizar las URLs de origen como destino.
4. Ejecutar `node scripts/backups/backup.mjs restore`. El script descifra, comprueba hashes y compara conteos del snapshot. Guardar el informe con `CER_RESTORE_REPORT` en una ruta privada.
5. Ejecutar `node scripts/backups/storage.mjs restore` hacia el bucket vacío de ese proyecto aislado. Verificar todas las rutas de `cer_attachments`, descargar las fotos y revisar legibilidad de etiquetas.
6. Reconfigurar Auth, SMTP, URLs y funciones de ese entorno desde su configuración segura. Probar acceso, equipos, tareas, historial y permisos con cuentas de prueba. Restaurar datos no recupera automáticamente secretos ni la configuración de proveedores.
7. Solo con evidencia de recuperación completa, marcar `CER_RESTORE_TESTED=true` y autorizar `CER_BACKUP_ROTATION_ENABLED=true`. Se conservarán 30 diarios y 12 mensuales, con borrado condicionado a verificar una copia reciente.

No se realizó aún esta restauración. Ante pérdida total se recuperan base, objetos, código y configuración por separado. La pérdida posible abarca desde el snapshot recuperado hasta el incidente; con copias diarias puede acercarse a 24 horas, o más si hubo fallos. No prometer un plazo menor sin otra política de respaldo.

Referencias: [rclone Drive](https://rclone.org/drive/), [alcances de Google Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [recuperación de Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
