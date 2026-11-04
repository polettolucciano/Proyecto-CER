> **Alternativa inactiva.** La decisión posterior del 03/11/2026 es usar Google Drive, sin activar facturación de Cloudflare. Los workflows actuales usan [ACTIVACION_DRIVE.md](ACTIVACION_DRIVE.md). No seguir estos pasos para la configuración actual.

# Activar backups automáticos en Cloudflare R2

Destino elegido el 03/11/2026. La automatización corre en GitHub Actions aunque la computadora esté apagada. Cloudflare R2 conserva las copias; Supabase sigue siendo la base de datos y el almacenamiento operativo de fotos. No se necesita un dominio ni un Worker.

## 1. Cuenta y bucket privado

1. Crear la cuenta en Cloudflare y verificar su correo. Entrar en **Storage & databases → R2 Object Storage**.
2. Revisar y aceptar personalmente las condiciones de facturación que presente Cloudflare. La cuenta gratuita no implica uso ilimitado de R2: revisar [precios oficiales](https://developers.cloudflare.com/r2/pricing/) y controlar consumo, especialmente el crecimiento de fotos y copias mensuales.
3. Crear un bucket exclusivo, por ejemplo `cer-backups`, con clase Standard. Mantener desactivados **Public Development URL (r2.dev)** y dominios públicos. No hace falta CORS.
4. Anotar Account ID y nombre exacto del bucket. Si se eligió una jurisdicción especial, anotarla también. No modificar la ubicación del almacenamiento operativo de Supabase.

## 2. Credenciales R2

En la administración de tokens R2, crear credenciales S3 limitadas a **ese bucket**. Guardar Access Key ID y Secret Access Key directamente en el gestor de contraseñas y GitHub; no enviarlas por chat. Las claves S3 no son el token Bearer de la API de Cloudflare.

| Uso | Permiso R2 | Environment de GitHub |
|---|---|---|
| Generar SQL y fotos | Object Read & Write | cer-backups |
| Monitorear | Object Read only | cer-backups-monitor |
| Rotar después de probar restauración | Object Read & Write, token separado | cer-backup-rotation |

Los tokens de escritura también pueden borrar objetos. La separación de jobs y `--immutable` no impiden que una credencial comprometida borre copias. Evaluar [bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/) con el responsable; definir plazos compatibles antes de activarlos. La política de conservación es una propuesta técnica pendiente de validación por CER. No habilitar expiración automática del bucket que eluda los controles de recuperación.

## 3. Clave de cifrado

En un equipo confiable con age instalado desde su distribución oficial, generar la identidad **fuera del repositorio**:

```sh
age-keygen -o /ruta/privada/cer-backup-identity.txt
```

Custodiar esa identidad en un gestor seguro y una copia offline. Guardar solo el destinatario **público** `age1…` en GitHub. La clave privada no se sube a Actions. Sin ella, los backups no se pueden recuperar.

## 4. Configurar GitHub

En `polettolucciano/Proyecto-CER` → Settings → Environments, crear los tres environments de la tabla. Restringirlos a la rama revisada; proteger rotación con revisión manual si el plan lo permite. El repositorio es público: no imprimir archivos de configuración ni adjuntar dumps como artifacts. Nunca ejecutar workflows con secretos desde código de terceros.

Crear estas **variables de repositorio** (no flags de environment: los `if` de jobs las necesitan antes de entrar al environment):

| Variable | Valor inicial |
|---|---|
| CER_R2_ACCOUNT_ID | ID de la cuenta Cloudflare |
| CER_R2_BUCKET | Nombre exacto, por ejemplo cer-backups |
| CER_R2_PREFIX | Backups-CER |
| CER_R2_JURISDICTION | default; eu/fedramp solo si corresponde al bucket |
| CER_SOURCE_PROJECT_REF | pnqsvmtmkceznoswpgfz |
| CER_BACKUP_AGE_RECIPIENT | Destinatario público age1… |
| CER_STORAGE_REMOTE | cer-source:cer-evidence |
| CER_BACKUPS_ENABLED | false |
| CER_STORAGE_BACKUP_ENABLED | false |
| CER_BACKUP_ROTATION_ENABLED | false |
| CER_RESTORE_TESTED | false |

En **cada environment**, crear secrets `CER_R2_ACCESS_KEY_ID` y `CER_R2_SECRET_ACCESS_KEY` con el token correspondiente. En `cer-backups`, agregar `CER_BACKUP_DATABASE_URL` (conexión de sesión PostgreSQL de Supabase Connect, TLS `sslmode=require`, contraseña percent-encoded) y el secreto de fuente de fotos del siguiente paso. El runner de GitHub debe poder alcanzar esa conexión; usar pooler de sesión cuando la conexión directa requiera IPv6 no disponible.

Los workflows generan el archivo rclone privado con `scripts/backups/configure-r2.mjs`, calculan `CER_BACKUP_REMOTE=cer-r2:<bucket>/<prefijo>` y prueban lectura del destino antes de generar dumps. No copiar configs de Drive. Retirar variables heredadas `CER_BACKUP_REMOTE` y, una vez revisado que ningún otro proceso las use, secretos `RCLONE_CONFIG_CREATE`, `RCLONE_CONFIG_READ`, `RCLONE_CONFIG_ROTATE`.

Opcional: `CER_ALERT_WEBHOOK` HTTPS en cada environment. Sin webhook, configurar las notificaciones de ejecuciones fallidas de Actions para el responsable y comprobarlas con una ejecución controlada fallida. Un monitor dentro de GitHub no detecta que todo GitHub dejó de ejecutar: un watchdog externo sigue pendiente.

## 5. Fuente de las fotos

En Supabase → Storage → S3, obtener endpoint, región y claves. Las claves S3 generadas por Supabase omiten RLS y permiten acceso a todos los buckets; mantenerlas exclusivamente en el runner protegido. Este script solo ejecuta lectura del origen, pero eso no reduce los permisos de la clave. No llamarla clave de solo lectura.

Guardar este INI, con los valores reales ingresados privadamente, como secret `RCLONE_CONFIG_STORAGE` en `cer-backups`. Debe contener **solo** este remote:

```ini
[cer-source]
type = s3
provider = Other
env_auth = false
access_key_id = <clave S3 de Supabase>
secret_access_key = <secreto S3 de Supabase>
endpoint = https://pnqsvmtmkceznoswpgfz.storage.supabase.co/storage/v1/s3
region = <región indicada por Supabase>
force_path_style = true
no_check_bucket = true
```

El destino R2 se añade automáticamente; no incluir `[cer-r2]` en este secreto. Un dump SQL contiene referencias a fotos, pero no sus bytes: el respaldo de Storage es obligatorio para recuperar CER completo.

## 6. Publicar y comprobar

Publicar los cambios revisados en la rama predeterminada requiere aprobación: actualizar `main` también puede desplegar Vercel. No se hizo automáticamente durante esta preparación.

1. Con los workflows revisados publicados y secretos configurados, habilitar `CER_BACKUPS_ENABLED=true` y ejecutar manualmente **CER backups**. Comprobar en R2 `Backups-CER/Diarios/CER-…tar.gz.age` y su JSON. Solo se publica el manifiesto después de verificar los bytes cifrados remotos.
2. Habilitar `CER_STORAGE_BACKUP_ENABLED=true` y ejecutar **CER Storage backup**. Comprobar su propio archivo/manifiesto en `Backups-CER/Archivos/Diarios` y conteo de objetos. SQL y fotos se ejecutan con la misma exclusión mutua para evitar solapamiento con la rotación.
3. Ejecutar **CER backup freshness**. Debe verificar antigüedad y bytes de ambas copias. Un job omitido no es una verificación satisfactoria.
4. Horarios programados: SQL 03:17 y fotos 03:47 de Argentina (06:17 y 06:47 UTC), monitor cada seis horas. GitHub puede retrasar ejecuciones; son horarios solicitados, no garantías. Tras inactividad, revisar que los schedules sigan habilitados.
5. Conservar los enlaces de ejecuciones exitosas. No habilitar rotación todavía.

## 7. Recuperación aislada antes de habilitar borrados

Seguir [BACKUPS.md](BACKUPS.md) y [ENVIRONMENT.md](ENVIRONMENT.md). En una sesión privada con rclone/age/tar/psql:

1. Preparar la configuración R2 de lectura con `configure-r2.mjs` (ruta nueva privada en `RCLONE_CONFIG`) y exportar `CER_BACKUP_REMOTE=cer-r2:<bucket>/Backups-CER`. Descargar archivo SQL, fotos y sus manifiestos. Elegir fotos que contengan todas las rutas referidas por el snapshot SQL.
2. Crear un Supabase de recuperación vacío, versión compatible, distinto del activo. Su creación puede tener costos y requiere decisión del responsable. Nunca restaurar sobre el proyecto activo.
3. Ejecutar `node scripts/backups/backup.mjs restore` con variables de restauración; guardar informe privado usando `CER_RESTORE_REPORT`. El script verifica hashes/conteos y rechaza el origen y destinos con registros CER o usuarios existentes.
4. Ejecutar `node scripts/backups/storage.mjs restore` hacia su bucket vacío y verificar cada ruta de `cer_attachments`. Para esta sesión agregar el remote del proyecto de recuperación al config privado, sin modificar las credenciales de CI.
5. Probar login, permisos reales por rol, historial y legibilidad de fotos en la aplicación conectada a ese entorno. Conteos correctos no prueban todo el flujo.
6. Solo con evidencia completa y aprobación, marcar `CER_RESTORE_TESTED=true` y `CER_BACKUP_ROTATION_ENABLED=true`. Política propuesta existente: conservar 30 copias diarias y 12 mensuales; mensual el día 1 UTC, tanto para SQL como fotos. La rotación verifica una copia reciente antes de borrar.

Estado inicial: preparación local, sin primer backup R2 ni restauración acreditados. No marcar flags de éxito por haber configurado credenciales.

Referencias: [R2 con rclone](https://developers.cloudflare.com/r2/examples/rclone/), [tokens R2](https://developers.cloudflare.com/r2/api/tokens/), [autenticación S3 de Supabase](https://supabase.com/docs/guides/storage/s3/authentication), [restauración Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
