# Backend CER: auditoría y plan de ejecución

## Código revisado
React 19 + Vite + TypeScript, formularios por dominio, IndexedDB mediante WorkspaceRepository. Se revisaron las capas y flujos afectados, pruebas, exportaciones y configuración. Al iniciar esta etapa no había login, RLS ni sincronización compartida. Ahora existe una implementación local del adaptador y las políticas; falta verificarla en un proyecto remoto. El modo conectado no genera una demo cuando falla la carga.

## Decisiones
1. Mantener las pantallas y añadir un adaptador Supabase con comandos SQL transaccionales. No enviar reemplazos de tablas completas.
2. PostgreSQL conserva equipos, tareas, perfiles, permisos por módulo, registros inmutables, adjuntos, auditoría y capacitación. Fechas operativas en Córdoba; instantes UTC.
3. Auth con cuentas invitadas. Roles leídos de profiles; nunca de user_metadata ni del selector demo. RLS en todas las tablas expuestas. Escrituras solo por funciones controladas.
4. Revisionado optimista global por transacción: ante un cambio concurrente se rechaza el guardado y se solicita recargar; no se sobrescribe silenciosamente. Propuesta inicial para unos 10 usuarios, pendiente de prueba remota de concurrencia; evolucionar a revisiones por agregado si la contención lo requiere.
5. Fotografías en Storage privado, no en JSON/base64. Carga antes del commit; metadatos vinculados dentro de la transacción. No borrar adjuntos históricos.
6. Respaldos diarios cifrados, generación separada de rotación y restauración aislada. Destino intercambiable Drive con OAuth/drive.file o R2 privado; ningún secreto en la aplicación.

## Fases verificables
- A: migraciones, validaciones, RLS y pruebas de permisos/integridad.
- B: Auth y adaptador preparados; integración con el servicio y correos pendiente.
- C: scripts y workflows de backups SQL/Storage, rotación, monitor y restauración preparados; ejecución externa pendiente.
- D: integración remota, QA multidispositivo y aprobación de producción.

## Decisiones operativas pendientes
- Regla de avance desde fecha prevista o fecha realizada; quincenal cada 15 días frente a dos fechas fijas por mes. Se exigirá elección explícita antes de habilitar avance recurrente.
- Supervisor no confirmado: se conserva el dato, no se crean permisos extra por intuición.
- Retención de registros y política definitiva de fotos. No se habilita eliminación de historial.
- Separación de turnos de Mixer y desinfección/rotación de Loop: se mantienen los formularios actuales.

## Dependencias externas
Proyecto Supabase, remitente de invitaciones, primer administrador, destino Drive o R2, secretos de GitHub y proyecto de restauración aislado. No se modifica producción ni se importa la demo automáticamente.
