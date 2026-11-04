# Activar los respaldos en Google Drive personal

Destino confirmado por el usuario el 03/11/2026: **cerresistencia@gmail.com**. No requiere contratar un plan de pago; el espacio disponible debe vigilarse. Este procedimiento aún requiere acreditar OAuth, primera copia y recuperación. La web de inspección continúa sin ingreso y con datos de demostración. Ninguna credencial se pega en el chat ni se sube a Git.

## Estado de espera solicitado por el usuario

El 03/11/2026 el usuario indicó que no hay datos reales y pidió dejar todo preparado **sin generar backups hasta una nueva instrucción expresa**. Los workflows están publicados en main pero deshabilitados manualmente en GitHub; los cuatro flags permanecen false. Las validaciones manuales de definición terminaron skipped y no generaron respaldos.

Cliente OAuth de CER creado con drive.file e información pública publicada. Google mantiene el cliente en Testing; cambiarlo a producción y completar OAuth requieren autorización específica pendiente. Tampoco se cargaron las credenciales privadas del origen SQL y fotografías. No presentar las conexiones de origen como terminadas.

La identidad age está fuera del repositorio, en Documents/CER-Recuperacion/cer-backup-identity.txt, con permisos privados. Custodiar otra copia segura/offline antes de depender de los backups. GitHub solo contiene su destinatario público.

Cuando el usuario indique activar: completar OAuth propio y credenciales de origen, volver a habilitar los workflows en Actions, ejecutar la primera copia SQL y fotos y verificar sus bytes. Monitoreo y canal de avisos se comprueban entonces. La rotación sigue condicionada a recuperación aislada y autorización; no se habilita por empezar a generar copias.

## 1. Autorizar Google una sola vez

En una computadora confiable instalar `rclone` y `age` desde sus distribuciones oficiales. La generación automática posterior ocurre en GitHub, aunque esta computadora esté apagada.

1. Ejecutar `rclone config`.
2. Crear un remote llamado `cer-drive`, de tipo Google Drive.
3. Elegir el alcance `drive.file`: solo archivos creados o abiertos por esta aplicación. Usar el navegador propio para autorizar la cuenta personal. No hacer pública la carpeta.
4. Usar un cliente OAuth **propio de CER**: el cliente compartido de rclone se retira durante 2026. En Google Cloud crear un proyecto sin facturación, habilitar Google Drive API, configurar consentimiento y crear un cliente OAuth de escritorio. Solicitar solo drive.file y pasar la aplicación a producción para evitar renovación semanal del permiso de Testing. Las condiciones de Google y el consentimiento los acepta el titular. No activar prueba gratuita, facturación ni productos de pago. Ingresar credenciales solo en la configuración privada.
5. Crear el árbol con la misma aplicación autorizada:

```bash
rclone mkdir 'cer-drive:Backups CER/Diarios'
rclone mkdir 'cer-drive:Backups CER/Mensuales'
rclone mkdir 'cer-drive:Backups CER/Archivos/Diarios'
rclone mkdir 'cer-drive:Backups CER/Archivos/Mensuales'
rclone mkdir 'cer-drive:Backups CER/Registros-de-verificacion'
```

Verificar estas carpetas desde Drive sin cambiar sus permisos. `drive.file` no equivale a credenciales separadas de lectura y borrado: usar environments protegidos en GitHub para la rotación.

### Publicación de la conexión propia

Google requiere completar Información de la marca con páginas públicas de presentación y privacidad. Las páginas preparadas en este proyecto son `/backups/index.html` y `/backups/privacidad.html`; se publican con aprobación y se verifican antes de ingresarlas en Google. No reemplazan una revisión de las políticas generales del centro.

En el proyecto Google `cerresistencia`, el cliente de escritorio se llama `CER Backups diarios` y se solicita únicamente `https://www.googleapis.com/auth/drive.file`. Después de publicar la información de marca, pasar la conexión a producción y autorizar nuevamente con ese cliente. No usar para automatización durable el token de la prueba inicial realizada con el cliente compartido de rclone. La carpeta inicial se identifica como `CER - prueba de conexion`; no contiene un backup de CER.

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
| CER_STORAGE_REMOTE | cer-source:cer-evidence |
| CER_BACKUP_AGE_RECIPIENT | El destinatario público age |
| CER_BACKUPS_ENABLED | false |
| CER_STORAGE_BACKUP_ENABLED | false |
| CER_BACKUP_ROTATION_ENABLED | false |
| CER_RESTORE_TESTED | false |

En `cer-backups`: guardar `CER_BACKUP_DATABASE_URL` obtenida en Supabase Connect, con TLS `sslmode=require` y contraseña correctamente codificada. Guardar solo la sección `[cer-drive]` de la configuración privada de rclone en `RCLONE_CONFIG_DRIVE`: type=drive, scope=drive.file y token JSON con refresh_token. Incluir obligatoriamente client_id y client_secret propios de CER. No incluir otras opciones o remotes. La ubicación local se consulta con `rclone config file`; copiar su contenido directamente a GitHub, sin enviarlo por chat.

En `cer-backups-monitor` y `cer-backup-rotation`: `RCLONE_CONFIG_DRIVE`. El destino se calcula automáticamente como `cer-drive:Backups CER`; no se usan secretos ni variables de R2. Para Drive personal esas configuraciones pueden corresponder al mismo OAuth; el control de borrado depende del environment protegido. No declarar aislamiento de credenciales que Google no ofrece.

Para fotos, configurar el remote S3 `cer-source` del bucket privado `cer-evidence` y guardar **solo esa sección** en `RCLONE_CONFIG_STORAGE` del environment `cer-backups`. Definir `CER_STORAGE_REMOTE=cer-source:cer-evidence`. Las claves S3 generadas por Supabase son privilegiadas y omiten RLS; el script solo lee la fuente, pero eso no limita los permisos de la clave. No usar una clave privilegiada en la web. Las credenciales de Storage se obtienen privadamente en Supabase; su configuración y acceso todavía deben verificarse.

### Ejemplo de fuente S3 (ingresar valores reales privadamente)

```ini
[cer-source]
type = s3
provider = Other
env_auth = false
access_key_id = <clave S3 Supabase>
secret_access_key = <secreto S3 Supabase>
endpoint = https://pnqsvmtmkceznoswpgfz.storage.supabase.co/storage/v1/s3
region = <región del proyecto>
force_path_style = true
no_check_bucket = true
```

El configurador añade Drive automáticamente. Crear los flags como variables **de repositorio**, ya que se evalúan antes de acceder al environment. No subir cambios a main sin autorización: puede desplegar Vercel automáticamente.

## 4. Primera ejecución y evidencia

1. Con los scripts revisados en `main`, activar **solo** `CER_BACKUPS_ENABLED=true`.
2. Actions → CER backups → Run workflow. Revisar que el job `generate` termine correctamente y que en Drive existan el `.tar.gz.age` y su manifiesto `.json` del mismo momento.
3. Configurar y activar Storage, ejecutar CER Storage backup y comprobar su propio archivo y manifiesto. Una copia SQL no contiene los bytes de las fotos.
4. Ejecutar CER backup freshness. Debe comprobar antigüedad y volver a leer los bytes cifrados. No considerar una ejecución “skipped” como verificación satisfactoria.
5. En GitHub → Settings → Notifications, activar avisos de Actions fallidos para el responsable. Para un canal adicional, configurar `CER_ALERT_WEBHOOK` directamente en cada environment que deba enviar avisos. Probar el canal deliberadamente antes de depender de él. Un fallo del scheduler de GitHub requiere vigilancia independiente; no se configuró un watchdog externo.
6. Conservar fecha, ejecución de Actions y manifiestos como evidencia. No activar borrado todavía.

Los horarios preparados son 03:17 de Argentina para SQL, 03:47 para archivos y un monitor cada seis horas. GitHub puede retrasar ejecuciones o desactivar schedules por inactividad. El monitor alerta al 85% de capacidad; incluye otros servicios Google y no duplica lo usado por la papelera. Las eliminaciones de rotación usan la papelera de Drive, que continúa ocupando espacio: no se vacía automáticamente ni se contratan ampliaciones.

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
