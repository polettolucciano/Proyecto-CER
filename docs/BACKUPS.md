# Respaldos CER — preparación, activación y recuperación

Estado al 03/11/2026 (decisión más reciente): el destino es **Google Drive de cerresistencia@gmail.com**. Cloudflare R2 se descartó por requerir activar facturación. La programación diaria y configuración privada están preparadas localmente; falta completar OAuth, secretos, publicación autorizada y backup/restauración reales. Ver [ACTIVACION_DRIVE.md](ACTIVACION_DRIVE.md).

## Diseño
El workflow diario genera roles, estructura, datos e historial de migraciones con la CLI oficial de Supabase fijada en package-lock. Incluye las políticas CER de Storage para recrearlas en un proyecto vacío. Comprime con tar/gzip y cifra con age usando solo la clave pública. Verifica estructura del archivo y hashes, sube el cifrado con rclone y vuelve a leerlo para comparar SHA-256. Solo después publica su manifiesto de éxito.

Los datos de CER y Auth salen de una única ejecución de `pg_dump --data-only`, con su snapshot coherente. No aplicar cambios de esquema mientras se genera una copia: esquema, roles e historial se exportan en pasos separados. Los conteos de referencia se calculan del propio archivo COPY, no de una consulta posterior que podría ver otros datos. El monitor vuelve a leer y comprobar el hash remoto; un JSON que diga “verified” no basta.

La verificación estructural NO es una restauración. Se requiere restaurar periódicamente en un Supabase de pruebas vacío de versión compatible. No contiene Vault ni claves de cifrado externas: CER no los utiliza. Si se agregan, revisar el alcance según la documentación oficial.

## Destino Google Drive

Los workflows construyen el remote `cer-drive` con `configure-drive.mjs`: tipo Drive y alcance `drive.file`. La raíz es `cer-drive:Backups CER`. Se requiere cliente OAuth propio de CER por el retiro anunciado del cliente compartido de rclone en 2026. Se rechazan tokens sin refresh_token, opciones desconocidas y destinos heredados. La configuración se crea con modo 0600 y se limpia tras el job.

Solicitar drive.file durante OAuth: solo permite acceder a archivos creados/abiertos por esa aplicación. Crear las carpetas con rclone, no desde la web: `Diarios`, `Mensuales`, `Archivos/Diarios` y `Archivos/Mensuales`. No hacer pública la carpeta. Los workflows las crean antes de generar copias.

El token puede modificar y borrar los archivos de la aplicación, incluso en el job de monitoreo. Separar environments y proteger rotación no crea permisos de solo lectura del proveedor. `--immutable` tampoco es protección WORM. No se activa borrado permanente ni vaciado automático de la papelera.

El monitor revisa cada seis horas el espacio total (Drive y otros servicios Google, sin duplicar papelera) y falla al alcanzar 85% para disparar el canal de alertas. Las cuotas gratuitas son limitadas: no hay contratación ni ampliación automática. La papelera también ocupa espacio; su revisión/vaciado requiere una decisión del responsable. Si se agota el espacio, la nueva copia falla y se debe investigar la alerta.

## Cifrado
Instalar age desde su distribución oficial. Ejecutar `age-keygen -o age-identity.txt`. Guardar la identidad privada fuera del repositorio y fuera de GitHub Actions (gestor de contraseñas y copia offline). Guardar solo el destinatario público `age1…` en `CER_BACKUP_AGE_RECIPIENT`. Sin la identidad privada no es posible restaurar.

## GitHub
Crear environments `cer-backups`, `cer-backup-rotation` y `cer-backups-monitor`. Proteger rotación y restringir ramas que reciben secretos. Configurar `RCLONE_CONFIG_DRIVE` en los tres, más conexión SQL y fuente de fotos solo en generación, según [ENVIRONMENT.md](ENVIRONMENT.md).

Los horarios diarios solicitados son 03:17 de Argentina para SQL y 03:47 para fotos. Ambos y la rotación comparten grupo de concurrencia. Funcionan con la computadora apagada. El monitor se ejecuta cada seis horas y vuelve a leer los bytes del backup reciente. Con webhook opcional `CER_ALERT_WEBHOOK` o notificaciones de fallos de Actions, el responsable recibe el fallo; se requiere comprobar ese canal.

Activar solo generación tras una ejecución manual verificada. Conservar 30 diarios y 12 mensuales; mensual se crea el día 1 UTC. La rotación es otro job y requiere una copia reciente re-verificada y restauración aprobada. Nunca borra una copia si falla la generación. El monitor corre cada 6 horas y falla si no hay manifiesto correcto de menos de 36 horas. GitHub puede retrasar schedules y desactivarlos por inactividad; para garantía independiente, configurar además un watchdog externo una vez elegido el servicio. No depende de la MacBook.

## Listar y restaurar
Ejecutar scripts solo desde un entorno confiable con age, tar, rclone, psql y las variables requeridas. Todos los archivos descifrados contienen datos privados: usar disco cifrado y una carpeta temporal protegida; en CI usar runners efímeros.

1. `node scripts/backups/backup.mjs list` muestra nombres y fechas; descargar el archivo y su JSON con rclone a una carpeta privada.
2. Crear un Supabase **de pruebas vacío** compatible. No usar el proyecto activo ni un destino con tablas CER.
3. Definir localmente `CER_RESTORE_DATABASE_URL`, `CER_RESTORE_TEST_HOST` (hostname exacto), `CER_BACKUP_DATABASE_URL` (origen), `CER_RESTORE_FILE`, `CER_RESTORE_MANIFEST`, `CER_RESTORE_AGE_IDENTITY` (ruta privada), `CER_RESTORE_CONFIRM=cer-test-only`.
4. `node scripts/backups/backup.mjs restore`: comprueba hash exterior, descifra, verifica rutas y hashes internos, rechaza origen/destino equivalentes y destinos con tablas CER o cuentas Auth; restaura con ON_ERROR_STOP en una transacción. Compara conteos de equipos, tareas, registros, perfiles, cuentas Auth, auditoría, adjuntos y capacitaciones contra el snapshot. Rechaza referencias huérfanas. Definir `CER_SOURCE_PROJECT_REF` y, opcionalmente, `CER_RESTORE_REPORT` para guardar un informe privado.
5. Comparar conteos, valores, fechas y usuarios con la referencia del backup; probar login, RLS y flujos de aplicación con cuentas de prueba. Conservar el informe en Registros-de-verificacion. No declarar recuperación completa solo por los conteos.
6. Tras la primera prueba satisfactoria, habilitar `CER_RESTORE_TESTED=true`; valorar activar rotación.

## Fotografías y Storage — flujo independiente preparado
Los dumps SQL incluyen metadatos, NO los bytes de fotografías. El script `scripts/backups/storage.mjs` y el workflow `storage-backup.yml` preparan otro flujo diario: lectura de `cer-evidence` mediante credenciales privadas de Storage, inventario path/tamaño/hash, copia completa de objetos inmutables, compresión y age, subida y verificación remota, y copia mensual/rotación independiente. Al restaurar, subir objetos con los mismos paths a un bucket privado y verificar todos los paths de `cer_attachments` antes de permitir acceso.

Configurar el remote S3 `cer-source` de Supabase Storage según la guía de activación. Las claves S3 generadas por Supabase son privilegiadas y omiten RLS: no llamarlas credenciales de solo lectura. El script solo lee la fuente; limitar su uso al runner protegido. `RCLONE_CONFIG_STORAGE` contiene únicamente esa fuente y nunca se entrega al navegador. Con otra sesión, el destino de restauración debe apuntar a un bucket vacío de un proyecto de pruebas diferente.

Comandos: `node scripts/backups/storage.mjs generate`, `monitor`, `rotate` y `restore`. La restauración requiere las variables documentadas en ENVIRONMENT, verifica inventario y hashes, copia sin sobrescribir y compara los bytes del destino. Nunca configurar como destino el bucket activo. La igualdad de nombres de remote no sustituye verificar su proyecto en el Dashboard.

Variables adicionales: `CER_STORAGE_BACKUP_ENABLED=false` y `CER_STORAGE_REMOTE`. Secret `RCLONE_CONFIG_STORAGE`. Este flujo todavía no se activó ni se verificó contra Google Drive: depende de configurar el proyecto y el destino. Hasta completarlo, los informes indican `storageIncluded=false` y `storageRestored=false`. No llamar a los dumps SQL un respaldo completo de CER si existen fotos. No activar la puesta en producción con este bloqueo abierto.

## Incidente de pérdida
Detener escrituras, preservar el estado actual, identificar última copia correcta, restaurar en pruebas, comparar pérdidas y obtener aprobación antes de cualquier operación sobre producción. La pérdida potencial corresponde al tiempo transcurrido desde el último snapshot correcto, más cualquier archivo fuera del respaldo. Este script no ofrece sobrescritura automática de producción.

Referencias: [Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Drive con rclone](https://rclone.org/drive/), [almacenamiento Google](https://support.google.com/drive/answer/6374270), [age](https://age-encryption.org/), [rclone](https://rclone.org/).

## Límites del procedimiento

El guardado SQL incluye datos y roles según la CLI oficial, pero no configura por sí solo el proyecto de Supabase: SMTP, URLs, proveedores Auth, secretos de funciones, claves de cifrado externas y configuración del proveedor deben recuperarse por separado desde su gestión segura. No guardar sus secretos junto con el código.

El guard de restauración SQL rechaza origen y destino con el mismo hostname y base, incluso si son dos proyectos tras un pooler compartido. Usar un hostname directo distinto y comprobar conectividad antes de la prueba; no quitar ese guard para salvar un error de conexión.

Los temporales se crean en un directorio privado y se limpian al terminar, también ante fallos controlados. Un corte abrupto puede impedir la limpieza: usar disco cifrado y revisar restos tras incidentes. Runners efímeros reducen ese riesgo.

Estos scripts no han ejecutado una restauración real. La prueba aislada puede revelar ajustes necesarios de compatibilidad de roles, schemas administrados o políticas ya existentes. No activar rotación ni operar datos reales hasta completarla. La carpeta Registros-de-verificacion debe conservar la salida del procedimiento y evidencia de acceso/archivos; el hash no demuestra que Auth y la aplicación sean recuperables.
