# Respaldos CER — preparación, activación y recuperación

Estado: código preparado; no hay proyecto origen ni destino elegido. No existe todavía un backup remoto ni una restauración remota comprobada. No activar rotación hasta completar la primera restauración y el respaldo de Storage.

## Diseño
El workflow diario genera roles, estructura, datos e historial de migraciones con la CLI oficial de Supabase fijada en package-lock. Incluye las políticas CER de Storage para recrearlas en un proyecto vacío. Comprime con tar/gzip y cifra con age usando solo la clave pública. Verifica estructura del archivo y hashes, sube el cifrado con rclone y vuelve a leerlo para comparar SHA-256. Solo después publica su manifiesto de éxito.

La verificación estructural NO es una restauración. Se requiere restaurar periódicamente en un Supabase de pruebas vacío de versión compatible. No contiene Vault ni claves de cifrado externas: CER no los utiliza. Si se agregan, revisar el alcance según la documentación oficial.

## Elegir destino
- Drive personal: crear una aplicación OAuth en Google Cloud, habilitar Drive API, tipo Desktop, scope `drive.file`. Configurar rclone Drive con alcance `drive.file`; autorizar en el navegador propio. La app debe crear sus carpetas para poder leerlas con ese alcance. Pasar la pantalla OAuth a producción para evitar caducidad de tokens de apps externas en Testing. No compartir la carpeta públicamente.
- Cloudflare R2: crear un bucket privado exclusivo y un token S3 limitado al bucket. Configurar rclone S3 con proveedor Cloudflare, endpoint de la cuenta y región auto. Activar bloqueo de bucket/versionado o retención cuando la configuración disponible lo permita; verificar compatibilidad de esa protección con la rotación.
- No se creó ni autorizó ninguna aplicación externa. Nunca pegar tokens o claves privadas en el chat.

Para configurar rclone, ejecutar `rclone config` en el propio equipo: New remote → nombre cer → elegir Drive y autorización OAuth local, o S3/Cloudflare con endpoint y credenciales privadas. Ejecutar `rclone lsd cer:` para verificar el acceso sin listar datos de otros destinos. Crear una carpeta/bucket exclusivo y conservar el archivo de configuración únicamente en el gestor de secretos. En Drive, las credenciales de la app OAuth se ingresan en rclone, nunca aquí. En R2, limitar el token a ese bucket; no utilizar credenciales de toda la cuenta.

Usar un remote de rclone llamado `cer` y una raíz exclusiva: `cer:Backups CER` (Drive) o `cer:bucket/Backups-CER` (R2). Configurar las carpetas `Diarios`, `Mensuales` y reservar `Registros-de-verificacion` para informes de restauración. Los manifiestos de verificación de cada backup se conservan junto a su archivo.

## Cifrado
Instalar age desde su distribución oficial. Ejecutar `age-keygen -o age-identity.txt`. Guardar la identidad privada fuera del repositorio y fuera de GitHub Actions (gestor de contraseñas y copia offline). Guardar solo el destinatario público `age1…` en `CER_BACKUP_AGE_RECIPIENT`. Sin la identidad privada no es posible restaurar.

## GitHub
Crear environments `cer-backups`, `cer-backup-rotation` y `cer-backups-monitor`. El environment de rotación debe tener aprobación manual inicialmente. Credenciales distintas para generación, lectura y borrado; si el proveedor OAuth no separa crear y borrar, conservar la credencial de rotación en un environment protegido y documentar que el aislamiento es operativo, no una garantía del proveedor.

Variables: `CER_BACKUPS_ENABLED=false`, `CER_BACKUP_ROTATION_ENABLED=false`, `CER_RESTORE_TESTED=false`, `CER_BACKUP_REMOTE`, `CER_BACKUP_AGE_RECIPIENT`, `CER_SOURCE_PROJECT_REF`.

Secrets: `CER_BACKUP_DATABASE_URL` (conexión PostgreSQL de sesión con TLS `sslmode=require`, contraseña percent-encoded), `RCLONE_CONFIG_CREATE`, `RCLONE_CONFIG_ROTATE`, `RCLONE_CONFIG_READ`. Son los contenidos de configuración de rclone; nunca se incluyen en la web. Webhook opcional `CER_ALERT_WEBHOOK` debe inyectarse en el paso Avisar fallo si se elige ese canal. Sin webhook, activar las notificaciones de fallos de Actions para el responsable.

Activar solo generación tras una ejecución manual verificada. Conservar 30 diarios y 12 mensuales; mensual se crea el día 1 UTC. La rotación es otro job y requiere una copia reciente re-verificada y restauración aprobada. Nunca borra una copia si falla la generación. El monitor corre cada 6 horas y falla si no hay manifiesto correcto de menos de 36 horas. GitHub puede retrasar schedules y desactivarlos por inactividad; para garantía independiente, configurar además un watchdog externo una vez elegido el servicio. No depende de la MacBook.

## Listar y restaurar
Ejecutar scripts solo desde un entorno confiable con age, tar, rclone, psql y las variables requeridas. Todos los archivos descifrados contienen datos privados: usar disco cifrado y una carpeta temporal protegida; en CI usar runners efímeros.

1. `node scripts/backups/backup.mjs list` muestra nombres y fechas; descargar el archivo y su JSON con rclone a una carpeta privada.
2. Crear un Supabase **de pruebas vacío** compatible. No usar el proyecto activo ni un destino con tablas CER.
3. Definir localmente `CER_RESTORE_DATABASE_URL`, `CER_RESTORE_TEST_HOST` (hostname exacto), `CER_BACKUP_DATABASE_URL` (origen), `CER_RESTORE_FILE`, `CER_RESTORE_MANIFEST`, `CER_RESTORE_AGE_IDENTITY` (ruta privada), `CER_RESTORE_CONFIRM=cer-test-only`.
4. `node scripts/backups/backup.mjs restore`: comprueba hash exterior, descifra, verifica rutas y hashes internos, rechaza origen/destino equivalentes y destinos no vacíos; restaura con ON_ERROR_STOP en una transacción. Emite conteos de equipos, registros, usuarios y auditoría, y huérfanos.
5. Comparar conteos, valores, fechas y usuarios con la referencia del backup; probar login, RLS y flujos de aplicación con cuentas de prueba. Conservar el informe en Registros-de-verificacion. No declarar recuperación completa solo por los conteos.
6. Tras la primera prueba satisfactoria, habilitar `CER_RESTORE_TESTED=true`; valorar activar rotación.

## Fotografías y Storage — flujo independiente preparado
Los dumps SQL incluyen metadatos, NO los bytes de fotografías. El script `scripts/backups/storage.mjs` y el workflow `storage-backup.yml` preparan otro flujo diario: lectura de `cer-evidence` mediante credencial de Storage de solo lectura, inventario path/tamaño/hash, copia completa de objetos inmutables, compresión y age, subida y verificación remota, y copia mensual/rotación independiente. Al restaurar, subir objetos con los mismos paths a un bucket privado y verificar todos los paths de `cer_attachments` antes de permitir acceso.

Configurar un remote S3 de Supabase Storage limitado a lectura del bucket; confirmar que la cuenta y plan elegidos permiten esa conexión. Guardar fuente y destino en `RCLONE_CONFIG_STORAGE`; el script no usa una service_role en el navegador. Con otra sesión, el destino de restauración debe apuntar a un bucket vacío de un proyecto de pruebas diferente.

Comandos: `node scripts/backups/storage.mjs generate`, `monitor`, `rotate` y `restore`. La restauración requiere las variables documentadas en ENVIRONMENT, verifica inventario y hashes, copia sin sobrescribir y compara los bytes del destino. Nunca configurar como destino el bucket activo. La igualdad de nombres de remote no sustituye verificar su proyecto en el Dashboard.

Variables adicionales: `CER_STORAGE_BACKUP_ENABLED=false` y `CER_STORAGE_REMOTE`. Secret `RCLONE_CONFIG_STORAGE`. Este flujo todavía no se activó ni se verificó: depende del proyecto y del destino. Hasta completarlo, los informes indican `storageIncluded=false` y `storageRestored=false`. No llamar a los dumps SQL un respaldo completo de CER si existen fotos. No activar la puesta en producción con este bloqueo abierto.

## Incidente de pérdida
Detener escrituras, preservar el estado actual, identificar última copia correcta, restaurar en pruebas, comparar pérdidas y obtener aprobación antes de cualquier operación sobre producción. La pérdida potencial corresponde al tiempo transcurrido desde el último snapshot correcto, más cualquier archivo fuera del respaldo. Este script no ofrece sobrescritura automática de producción.

Referencias: [Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [age](https://age-encryption.org/), [rclone](https://rclone.org/).

## Límites del procedimiento

El guardado SQL incluye datos y roles según la CLI oficial, pero no configura por sí solo el proyecto de Supabase: SMTP, URLs, proveedores Auth, secretos de funciones, claves de cifrado externas y configuración del proveedor deben recuperarse por separado desde su gestión segura. No guardar sus secretos junto con el código.

El guard de restauración SQL rechaza origen y destino con el mismo hostname y base, incluso si son dos proyectos tras un pooler compartido. Usar un hostname directo distinto y comprobar conectividad antes de la prueba; no quitar ese guard para salvar un error de conexión.

Los temporales se crean en un directorio privado y se limpian al terminar, también ante fallos controlados. Un corte abrupto puede impedir la limpieza: usar disco cifrado y revisar restos tras incidentes. Runners efímeros reducen ese riesgo.

Estos scripts no han ejecutado una restauración real. La prueba aislada puede revelar ajustes necesarios de compatibilidad de roles, schemas administrados o políticas ya existentes. No activar rotación ni operar datos reales hasta completarla. La carpeta Registros-de-verificacion debe conservar la salida del procedimiento y evidencia de acceso/archivos; el hash no demuestra que Auth y la aplicación sean recuperables.
