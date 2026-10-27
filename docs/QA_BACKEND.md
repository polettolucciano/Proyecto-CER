# QA de backend CER

## Continuación remota — 27/10/2026

Proyecto-CER (pnqsvmtmkceznoswpgfz) ya está vinculado. Se aplicaron las migraciones 20261026194345, 20261026194621 y 20261027034907. Consulta remota: 9 tablas CER en public, todas con RLS; bucket cer-evidence privado; sin política de inserción directa de fotos para usuarios del navegador.

Verificaciones locales de esta continuación: 4 pruebas de procesamiento real de imágenes aprobadas; las 8 pruebas SQL pertinentes aprobadas; typecheck del frontend y del módulo de procesamiento aprobado; build correcto. Las 22 pruebas anteriores del frontend no se repitieron por no haber cambios en sus reglas.

La primera preparación de un perfil técnico mediante REST administrativo fue rechazada por los grants explícitos del proyecto: no se ampliaron permisos para salvar ese error; la prueba pasó a usar el canal SQL administrativo. Se limpiaron esas cuentas temporales. Las primeras pruebas remotas del procesador detectaron problemas de inicio/empaquetado y no confirmaron la carga; no se presentan como éxito. La prueba posterior y sus resultados se registran en PHOTO_OPTIMIZATION.

El asesor de seguridad informa dos avisos sobre la función public.rls_auto_enable, preexistente en el proyecto con RLS automático. No pertenece a las migraciones CER ni se modificó en esta tarea; revisar sus grants antes del lanzamiento. El conector MCP no tiene permiso sobre este proyecto; las operaciones autorizadas se realizaron con la CLI vinculada.

Los apartados siguientes conservan la evidencia histórica del 26/10. Sus limitaciones sobre ausencia de proyecto/Docker ya no describen el estado actual; las pruebas de invitaciones, respaldos y restauración continúan pendientes.

Fecha: 26/10/2026. Esta evidencia incluye el trabajo anterior a la pausa y su continuación. No hay proyecto remoto conectado. Las capturas de acceso usan una URL/key local de prueba sin servicio disponible; no demuestran un login exitoso.

## Verificaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| npm run test:frontend | 22 pruebas, 7 archivos, aprobadas |
| npm run test:backend | 8 pruebas aprobadas tras el último cambio SQL |
| node --test tests/backups.test.mjs | 3 pruebas aprobadas en esta etapa: retención, antigüedad y guard de destino; sin cambios posteriores en esas reglas |
| npm run build | Aprobado; incluye tsc -b y build Vite |
| node --check scripts/backups/backup.mjs | Aprobado |
| node --check scripts/backups/storage.mjs | Aprobado |
| Transpilación TypeScript de cer-invite | Sintaxis válida; no sustituye typecheck/runtime Deno |
| npm audit --omit=dev | 0 vulnerabilidades conocidas tras override uuid/ExcelJS |
| Exportación ExcelJS writeBuffer/load | Valor conservado al escribir y releer XLSX |
| Escaneo acotado de patrones de secretos | 0 coincidencias en archivos candidatos a Git |
| git diff --check | Sin errores de whitespace |

No hay script lint configurado. El build advierte chunks mayores de 500 kB: principal aproximadamente 601 kB y ExcelJS diferido aproximadamente 929 kB, antes de gzip. No se ocultó el aviso.

## Cobertura SQL local

Las migraciones reales se aplican en PGlite, un motor PostgreSQL embebido. Se emulan auth.uid, auth.users y tablas Storage, con roles anon/authenticated.

- Enfermería ve sus módulos; no administra ni eleva su rol por SQL.
- Inactivo no consulta datos operativos.
- Rechazo de obligatorios/números inválidos; autoría del servidor y conservación de valores fuera de referencia.
- Reintento idempotente, control independiente confirmado y rechazo de revisión obsoleta.
- Rectificación/anulación sin borrar original; snapshot de formulario estable aunque cambie el catálogo.
- Configuración incompleta rechazada sin incrementar revisión.
- Registro y avance se revierten juntos cuando no está definida la regla.
- Mensual con ancla de día y año bisiesto.
- Anónimo/Enfermería no leen borradores; material publicado accesible.
- Objetos por módulo, bucket privado y bloqueo de borrado de evidencia vinculada.

La prueba de conflicto es secuencial con revisión obsoleta. No se presenta como prueba de dos conexiones simultáneas al servicio remoto.

## Navegador real — Playwright mediante CUA

- Login en escritorio y móvil 390×844: campos correo/contraseña, CTA y acceso público.
- Envío vacío bloqueado por validación nativa; ambos campos requeridos.
- Móvil: ancho de documento 390, sin desbordamiento horizontal.
- Biblioteca con servicio ausente muestra error explícito; no carga materiales ficticios.
- Demo: navegación de agenda a historial y cambio de Administrador a Enfermería.
- Enfermería conserva calendario de controles; navegación administrativa separada.
- Consola de la demo sin errores en el recorrido verificado.
- Se restauró perfil administrativo y el viewport normal al terminar.

Evidencia:
- [Acceso escritorio](evidence/backend-login-desktop.png)
- [Acceso móvil y obligatorio](evidence/backend-login-mobile.png)
- [Calendario móvil de Enfermería, demo](evidence/demo-nurse-calendar-mobile.png)

## Pendiente por falta de servicios/herramientas

Docker instalado pero daemon detenido; no se pudo levantar Supabase completo. Deno, age, rclone, psql y pg_dump no están disponibles en PATH. No se instalaron esas herramientas del sistema. La autenticación actual de gh es inválida; no se configuraron secrets ni workflows remotos.

Requieren entorno de pruebas: envío/aceptación de invitaciones y recuperación, logout/revocación y JWT reales, Edge Function, API REST y Storage con bytes, URLs firmadas, persistencia entre dispositivos, conflictos de múltiples sesiones, fallos de red después de confirmar una escritura, backups diarios reales, monitor/notificación y restauración SQL+archivos.

La compatibilidad de los scripts de restauración debe comprobarse con un Supabase vacío. No declarar que la información puede recuperarse hasta verificar usuarios, registros, relaciones, valores y fotos en ese destino.

## Criterio de cierre de esta etapa

Código y preparación local verificables; integración externa pendiente. No aprobado para producción ni para datos reales. Los siguientes pasos concretos están en SETUP_SUPABASE y DEPLOYMENT.
