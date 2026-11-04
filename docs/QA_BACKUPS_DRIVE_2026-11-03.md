# Revisión de backups Google Drive — 03/11/2026

## Decisión y alcance

El usuario cambió el destino a Google Drive de `cerresistencia@gmail.com`, conservando backups diarios y sin contratar un plan de pago. Cloudflare queda como alternativa inactiva; ninguno de los tres workflows actuales usa R2.

Se aplicaron las skills CER, robust-backend y real-user-qa al alcance de infraestructura. Se añadieron únicamente dos páginas públicas informativas para la conexión OAuth, sin modificar las pantallas de registros. Se comprobaron sus enlaces, contenido accesible sin login, consola sin errores y ancho sin desborde a 390 px y 1280 px. Evidencia: evidence/backups-drive-privacy-mobile.png y evidence/backups-drive-privacy-desktop.png.

## QA local ejecutado

- `npm run test:backups`: 18 pruebas aprobadas. Incluye políticas de recuperación existentes, configuración Drive y alternativa R2 inactiva.
- `npm test`: 30 pruebas Vitest y 44 pruebas Node aprobadas.
- `npm run build`: TypeScript/Vite aprobados; persiste advertencia de chunks mayores de 500 kB.
- Sintaxis YAML de los tres workflows validada con Ruby YAML.load_file; no equivale a ejecución en GitHub Actions.
- `git diff --check`: aprobado.

Los tests de Drive cubren scope limitado, refresh_token requerido, rechazo de remotes/opciones duplicadas o desconocidas, configuración de Storage separada, permisos reales 0600 y protección contra sobrescritura/enlaces. Las pruebas de cuota cubren el límite del 85%, otros servicios Google y papelera sin doble conteo, además de respuestas inválidas.

## Revisión de seguridad separada

- OAuth solicitado con `drive.file`, no acceso completo al Drive. El alcance real debe confirmarse durante consentimiento; un campo INI no reduce permisos ya concedidos.
- Secret `RCLONE_CONFIG_DRIVE` por environment; el token no aparece en argumentos de procesos, salida pública ni variables del navegador. Config temporal creado de forma exclusiva y limpieza `always()`.
- El token permite lectura, escritura y borrado de los archivos de la aplicación. Environments separados no constituyen separación de permisos del proveedor.
- Carpetas creadas por rclone para que sean accesibles con drive.file. No se configura uso público ni enlaces compartidos.
- Cifrado age, hashes remotos, restauración aislada y guard de rotación conservados. No se habilita rotación hasta recuperación acreditada.
- No hay vaciado automático de papelera, borrado permanente, compra de almacenamiento ni suscripción. La papelera consume cuota: requiere revisión operativa del responsable.
- Credenciales S3 de Supabase solo en el runner: omiten RLS y no se describen como de solo lectura.

## Integración remota y pendientes

Se descargó rclone v1.75.2 desde su distribución oficial y se verificó SHA-256. El usuario completó OAuth drive.file en Safari; se confirmó mediante Google Drive API que la cuenta es cerresistencia@gmail.com. rclone about confirmó 15 GiB de cuota y se crearon las carpetas iniciales. Estas pruebas usaron el cliente compartido y son evidencia de conectividad, no una habilitación durable: rclone anunció su retiro en 2026. El configurador de CI exige cliente propio de CER y rechaza ese cliente compartido. Se inició su preparación en el proyecto Google Cloud cerresistencia, sin activar facturación.

En GitHub se crearon y verificaron los environments cer-backups, cer-backups-monitor y cer-backup-rotation, con restricción de ramas y main permitido. Rotación exige aprobación del responsable. Variables de repositorio preparadas: origen, fuente Storage y los cuatro flags de activación/recuperación en false. Sin secretos ni publicación de código en esta etapa.

Falta terminar cliente OAuth propio y repetir autorización/acceso/carpetas con ese cliente, custodiar identidad age, secrets de GitHub para SQL y fotos, publicación autorizada de workflows, primer backup remoto, alertas y recuperación SQL/fotos con login/permisos reales. Ningún resultado local demuestra que ya exista una copia de CER en Drive.

Riesgos operativos: límites gratuitos compartidos con Gmail/Fotos, cambios o revocación de OAuth, schedules de GitHub demorados/desactivados por inactividad, y ausencia de watchdog externo. SQL y fotos son snapshots separados; al recuperar hay que comprobar todas las rutas referidas por SQL.

Guía actual: [ACTIVACION_DRIVE.md](ACTIVACION_DRIVE.md). No se modificó producción ni se desplegó código durante la preparación local.

## Avance de conexión propia

El usuario aceptó la política de datos de Google y autorizó crear el cliente CER Backups diarios y guardar la configuración en GitHub Secrets. Cliente de escritorio creado en cerresistencia, secreto descargado/protegido; alcance drive.file guardado como único permiso no sensible. Google mantiene la aplicación en Testing y bloquea Publicar app hasta completar página principal y privacidad. Se prepararon public/backups/index.html y public/backups/privacidad.html, revisadas localmente; publicación pendiente de autorización por afectar el despliegue de Vercel.

Se preparó la identidad de recuperación en Documents/CER-Recuperacion/cer-backup-identity.txt con modo 0600 y directorio 0700, fuera del repositorio. GitHub contiene únicamente el destinatario público. age v1.3.2 oficial verificado con SHA-256; prueba local de cifrado/descifrado aprobada con texto sin datos reales. El responsable debe custodiar otra copia segura/offline de la identidad antes de depender del sistema.

## Validación de publicación y corrección de Actions

El usuario autorizó publicar en main el 03/11/2026. El commit ce30e8e se publicó y Vercel confirmó READY; se verificaron en navegador las páginas públicas /backups/index.html y /backups/privacidad.html.

GitHub rechazó los workflows al validarlos: runner.temp no está disponible en jobs.<job_id>.env. La sintaxis YAML válida no detectaba ese error de contexto. Se trasladó la definición de RCLONE_CONFIG al primer paso de cada job, usando RUNNER_TEMP y GITHUB_ENV. actionlint v1.7.12 oficial, con SHA-256 verificado, aprobó los tres workflows corregidos. Los flags continúan en false; una ejecución omitida no acredita un backup.
