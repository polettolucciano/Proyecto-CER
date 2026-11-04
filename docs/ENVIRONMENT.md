# Variables y secretos

## Navegador / Vercel

| Variable | Uso |
|---|---|
| VITE_DATA_MODE | demo por defecto; supabase exige el servicio |
| VITE_SUPABASE_URL | URL pública del proyecto |
| VITE_SUPABASE_PUBLISHABLE_KEY | Clave pública sb_publishable_… |

Todo VITE_ queda visible en el bundle. Nunca introducir contraseñas, service_role, secret keys, OAuth, claves de cifrado ni credenciales de backups. Usar .env.local ignorado en desarrollo; configurar Vercel por entorno.

## Edge Functions

cer-evidence usa las variables de Supabase suministradas por el runtime. `CER_APP_ORIGINS` es opcional para ajustar los orígenes exactos autorizados; ver PHOTO_OPTIMIZATION. No requiere nuevas variables VITE_.

### cer-invite

APP_ORIGIN: origen exacto autorizado. Variables SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY disponibles exclusivamente en el entorno de la función. Nunca imprimirlas ni ponerlas en Git.

## GitHub Actions — Google Drive

Destino actual: Drive de `cerresistencia@gmail.com`. No se requiere Cloudflare, tarjeta ni suscripción de pago. El espacio gratuito se comparte con Gmail/Fotos; no contratar ampliaciones automáticamente.

Variables **de repositorio** (los flags se evalúan antes de entrar al environment):

| Nombre | Contenido |
|---|---|
| CER_BACKUPS_ENABLED | false hasta preparar secretos y ejecutar/verificar manualmente |
| CER_STORAGE_BACKUP_ENABLED | false hasta configurar fuente de fotos |
| CER_BACKUP_ROTATION_ENABLED | false hasta probar recuperación |
| CER_RESTORE_TESTED | true únicamente con evidencia de restauración |
| CER_STORAGE_REMOTE | cer-source:cer-evidence |
| CER_BACKUP_AGE_RECIPIENT | Destinatario público age |
| CER_SOURCE_PROJECT_REF | Referencia pública del proyecto respaldado |

Secrets por environment:

- `cer-backups`: `RCLONE_CONFIG_DRIVE`, `CER_BACKUP_DATABASE_URL` y `RCLONE_CONFIG_STORAGE`.
- `cer-backups-monitor`: `RCLONE_CONFIG_DRIVE`.
- `cer-backup-rotation`: `RCLONE_CONFIG_DRIVE`, con environment protegido.
- `CER_ALERT_WEBHOOK` HTTPS opcional en cada environment que deba notificar.

`RCLONE_CONFIG_DRIVE` contiene solo el remote `[cer-drive]`, `type = drive`, `scope = drive.file` y `token = <JSON OAuth con refresh_token>`. **Son obligatorios** `client_id` y `client_secret` propios de CER: rclone anunció el retiro de su cliente compartido en 2026. El flujo OAuth debe solicitar realmente drive.file; escribir el scope en el archivo no reduce los permisos de un token previamente emitido con acceso completo.

El mismo OAuth puede utilizarse en los tres environments. Esto **no** aísla lectura de escritura: drive.file permite modificar/borrar los archivos de la aplicación. El aislamiento de rotación es operativo, no un permiso separado del proveedor. No introducir tokens en el chat, en Git ni en variables VITE_.

`RCLONE_CONFIG_STORAGE` contiene únicamente `[cer-source]`, tipo S3, con credenciales privadas de Supabase. Sus claves S3 generadas omiten RLS y acceden a todos sus buckets; mantenerlas solo en el environment protegido. Ver ejemplo en [ACTIVACION_DRIVE.md](ACTIVACION_DRIVE.md).

El runner crea configuración 0600 mediante `configure-drive.mjs` y exporta automáticamente `CER_BACKUP_REMOTE=cer-drive:Backups CER`. No configurar destinos R2 ni secrets CER_R2_ en estos workflows. Los configuradores R2 se conservan como alternativa inactiva y no son invocados por Actions.

Para comandos manuales, exportar `RCLONE_CONFIG_DRIVE`, `CER_BACKUP_REMOTE=cer-drive:Backups CER` y `RCLONE_CONFIG` apuntando a un archivo **nuevo**, fuera del repositorio. Ejecutar `node scripts/backups/configure-drive.mjs`; añadir `--storage` con el secreto S3 cuando corresponda. Limpiar el config al terminar.

## Restauración manual aislada

CER_RESTORE_DATABASE_URL, CER_RESTORE_TEST_HOST, CER_BACKUP_DATABASE_URL (identifica origen), CER_SOURCE_PROJECT_REF, CER_RESTORE_FILE, CER_RESTORE_MANIFEST, CER_RESTORE_AGE_IDENTITY (ruta), CER_RESTORE_CONFIRM=cer-test-only. CER_RESTORE_REPORT permite guardar el informe privado en una ruta elegida fuera del repositorio.

Para archivos: CER_STORAGE_REMOTE (origen que debe diferir), CER_STORAGE_RESTORE_REMOTE, CER_STORAGE_RESTORE_APPROVED (destino exacto autorizado), CER_STORAGE_RESTORE_FILE y CER_STORAGE_RESTORE_MANIFEST. Reutiliza identidad age y confirmación de pruebas.

Estos valores van en la sesión privada del operador; no se generan archivos de secretos versionados. La identidad privada de age se conserva fuera de GitHub, con copia offline.
