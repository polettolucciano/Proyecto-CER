# Backups Cloudflare R2 — revisión local del 03/11/2026

## Alcance y criterios

Decisión confirmada del usuario: reemplazar Google Drive por Cloudflare R2 y dejar las conexiones preparadas para configurar después las cuentas definitivas. La política existente de 30 diarios/12 mensuales sigue siendo una propuesta técnica que CER debe validar.

Criterios locales: los tres workflows deben usar R2, mantener cifrado y verificación, separar monitor de generación/rotación, proteger secretos y conservar los bloqueos de borrado hasta probar recuperación.

## QA ejecutado

Se aplicó el criterio de la skill `real-user-qa` al alcance de infraestructura; no se modificaron pantallas. No se hizo una nueva prueba visual de la aplicación en móvil/escritorio.

| Comando / comprobación | Resultado observado |
|---|---|
| `npm run test:backups` | 13 pruebas aprobadas, incluidas configuración R2 y protecciones de recuperación existentes |
| `npm test` | 30 pruebas Vitest y 39 pruebas Node aprobadas |
| `npm run build` | TypeScript y Vite aprobados; advertencia de chunks mayores de 500 kB |
| Ruby YAML.load_file sobre los tres workflows | Sintaxis YAML válida; no equivale a ejecución en Actions |
| `git diff --check` | Sin errores de whitespace |
| Consulta de GitHub API de solo lectura | Repositorio público, rama main; sin variables, secrets ni environments listados en esa consulta |

Los tests nuevos ejercitan endpoint HTTPS y jurisdicciones R2, configuración incompleta y destinos heredados, inyección mediante saltos de línea, separación de fuente/destino, escritura real de configuración 0600, ausencia de claves en salida pública y rechazo de archivos existentes/enlaces. No usan servicios remotos ni simulan haber generado un backup remoto.

La consulta de Cloudflare en navegador alcanzó la pantalla de verificación de correo. No se activó facturación, creó bucket, generó credenciales ni envió datos operativos. El usuario decidió posponer las cuentas definitivas.

## Revisión de seguridad separada

- Las claves R2 se suministran por secrets de environment; el archivo INI se genera solo en el runner con modo 0600, creación exclusiva y limpieza `always()`.
- Monitor previsto con token Object Read only. Generación y rotación requieren Object Read & Write limitado al bucket: ese permiso también permite borrar. Documentado; no se declara protección WORM con `--immutable`.
- Se valida la raíz y se rechaza una configuración heredada que apunte a Drive. La fuente de fotos debe usar otro remote S3; no puede reemplazar la sección R2.
- Cifrado age, hashes remotos y guards de restauración/rotación existentes conservados. La identidad privada de age permanece fuera de GitHub.
- Las claves S3 generadas por Supabase omiten RLS; se corrigió la documentación que las describía como de solo lectura. No se crearon políticas ni migraciones remotas.
- Jobs de generación SQL/fotos y rotación comparten grupo de concurrencia para evitar solaparse. Monitoreo sigue independiente.

## Límites y próximos controles

**Bloqueante para afirmar backups operativos:** cuentas definitivas, bucket privado, secrets, publicación autorizada de workflows en rama predeterminada, primer SQL y fotos con hash remoto, monitor real y restauración completa aislada incluyendo login/permisos/fotos.

**Riesgos restantes:** permisos de escritura permiten borrado; bucket locks requieren definir retención compatible. GitHub puede retrasar/desactivar schedules y el monitor interno no detecta una interrupción total de Actions. Falta comprobar entrega de alertas y definir watchdog externo. Los respaldos SQL y fotos no forman una única transacción: elegir una copia de fotos que cubra todas las rutas del SQL al recuperar.

**Confianza:** preparación local verificada; integración remota pendiente. No se publicó código, cambió producción ni habilitaron flags de respaldo/rotación. Seguir [ACTIVACION_CLOUDFLARE.md](ACTIVACION_CLOUDFLARE.md).
