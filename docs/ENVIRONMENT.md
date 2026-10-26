# Variables y secretos

## Navegador / Vercel

| Variable | Uso |
|---|---|
| VITE_DATA_MODE | demo por defecto; supabase exige el servicio |
| VITE_SUPABASE_URL | URL pública del proyecto |
| VITE_SUPABASE_PUBLISHABLE_KEY | Clave pública sb_publishable_… |

Todo VITE_ queda visible en el bundle. Nunca introducir contraseñas, service_role, secret keys, OAuth, claves de cifrado ni credenciales de backups. Usar .env.local ignorado en desarrollo; configurar Vercel por entorno.

## Edge Function cer-invite

APP_ORIGIN: origen exacto autorizado. Variables SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY disponibles exclusivamente en el entorno de la función. Nunca imprimirlas ni ponerlas en Git.

## GitHub Actions

Variables de repositorio/environment:

| Nombre | Contenido |
|---|---|
| CER_BACKUPS_ENABLED | false hasta verificar el primer backup |
| CER_STORAGE_BACKUP_ENABLED | false hasta configurar fuente de fotos |
| CER_BACKUP_ROTATION_ENABLED | false hasta probar recuperación |
| CER_RESTORE_TESTED | true únicamente con evidencia de restauración |
| CER_BACKUP_REMOTE | Raíz privada de destino rclone |
| CER_STORAGE_REMOTE | Fuente rclone del bucket cer-evidence |
| CER_BACKUP_AGE_RECIPIENT | Destinatario público age |
| CER_SOURCE_PROJECT_REF | Referencia pública del proyecto respaldado |

Secrets: CER_BACKUP_DATABASE_URL, RCLONE_CONFIG_CREATE, RCLONE_CONFIG_ROTATE, RCLONE_CONFIG_READ, RCLONE_CONFIG_STORAGE y CER_ALERT_WEBHOOK opcional. Los configs contienen credenciales: ingresarlos directamente en GitHub, nunca en el chat ni en el repositorio.

RCLONE_CONFIG_STORAGE incluye fuente de solo lectura y destino de respaldo. READ solo lee el destino; ROTATE permite borrar exclusivamente el árbol de backups y debe permanecer en environment protegido.

## Restauración manual aislada

CER_RESTORE_DATABASE_URL, CER_RESTORE_TEST_HOST, CER_BACKUP_DATABASE_URL (identifica origen), CER_RESTORE_FILE, CER_RESTORE_MANIFEST, CER_RESTORE_AGE_IDENTITY (ruta), CER_RESTORE_CONFIRM=cer-test-only.

Para archivos: CER_STORAGE_REMOTE (origen que debe diferir), CER_STORAGE_RESTORE_REMOTE, CER_STORAGE_RESTORE_APPROVED (destino exacto autorizado), CER_STORAGE_RESTORE_FILE y CER_STORAGE_RESTORE_MANIFEST. Reutiliza identidad age y confirmación de pruebas.

Estos valores van en la sesión privada del operador; no se generan archivos de secretos versionados. La identidad privada de age se conserva fuera de GitHub, con copia offline.
