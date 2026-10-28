# CER — evidencia y puerta de entrega

## Decisiones vigentes

- Continuar el proyecto existente, sin rediseñar el frontend.
- Mantener la inspección sin ingreso en modo demo, por pedido expreso del usuario en esta etapa.
- Google Drive personal es el destino definitivo de backups.
- No publicar cambios de producción sin aprobación. Los archivos de esta etapa permanecen locales hasta esa autorización.

## Revisión inicial basada en código y servicio

| Área | Evidencia | Estado |
|---|---|---|
| Proyecto correcto | CLI vinculada a `pnqsvmtmkceznoswpgfz`, PostgreSQL 17.11 | Verificado remoto |
| Esquema | Migraciones 20261026194345, 20261026194621, 20261027034907 y 20261028231130 | Aplicadas, RLS activo |
| Cuentas reales | Conteos iniciales de perfiles/equipos/registros: 0 | No creadas, por decisión del usuario |
| Equipos y planificación | RPC transaccional, equipo, tarea mensual y posterior cambio de planificación | Verificado remoto con fixtures |
| Registros e historial | Autor y hora del servidor, validaciones, rectificación y anulación | Verificado remoto |
| Persistencia | Segunda sesión leyó el mismo registro | Verificado remoto |
| Permisos | Enfermería no administra ni escala rol; módulo ajeno y perfil desactivado bloqueados | Verificado remoto |
| Concurrencia | Una escritura HTTP 200 y otra HTTP 409/PT409, en 92 y 186 ms | Verificado remoto tras migración autorizada |
| Fotografías | `cer-evidence` ACTIVE, versión 5; evidencia previa del optimizador conservada | No reimplementado; falta recorrido con fotos reales autorizadas y restauración |
| Invitaciones | Implementación existente, validación JSON corregida y compatibilidad PT409 | 4 pruebas locales; función aún no desplegada, SMTP sin comprobar |
| Backups | Scripts y 3 workflows existentes, ahora con validación de manifiestos, hash remoto y comparación de conteos | 7 pruebas locales; OAuth/secretos/ejecución Drive pendientes |
| Recuperación | Destino aislado, guard contra alias del origen, conteos Auth/tareas/historial e informe privado | Código preparado; restauración real no ejecutada |
| Vercel | Publicación anterior en demo; ninguna variable modificada esta etapa | Mantener inspección abierta con demo |

## Correcciones realizadas

1. Nueva migración `20261028231130_conflict_http_status.sql`: conserva función, datos y privilegios; cambia el error esperado de versión desde SQLSTATE 40001 a PT409. PostgREST traduce la clase 40 a HTTP 500, mientras PT409 expresa el conflicto esperado. La prueba remota aisló el timeout también con HTTP directo; no se atribuye su causa de transporte con certeza. La migración se aplicó tras autorización explícita y la prueba remota posterior confirmó HTTP 409/PT409 sin timeout.
2. Invitaciones reconocen ambos códigos durante la transición; un conflicto reintenta el guardado del perfil sin volver a mandar el correo. JSON inválido devuelve 400.
3. Manifiestos de backup quedan vinculados al archivo y al proyecto; se rechazan fechas futuras, hashes inválidos y rutas/nombres inesperados. El monitor vuelve a comprobar bytes remotos.
4. Recuperación compara los conteos del archivo SQL real, incluidos usuarios Auth y tareas; rechaza destinos con cuentas existentes y alias conocidos del proyecto fuente. La rotación sigue deshabilitada hasta una recuperación aprobada.
5. Workflows reducen exposición de la conexión PostgreSQL al paso que la usa, no conservan credenciales Git de checkout, limpian configuración temporal y notifican también fallos de rotación.

## Pruebas ejecutadas

- `node --test tests/backend.test.mjs`: **8/8** locales con PostgreSQL emulado, incluida la migración nueva y el código PT409.
- `node --test tests/backups.test.mjs`: **7/7** locales de política, validación, conteos y guard de restauración. No simulan una subida real a Google.
- `node --test tests/invitations.test.mjs`: **4/4**, handler transpilado con Auth/SMTP simulados. No acreditan entrega de correo real.
- Primera ejecución sin concurrencia: PARTIAL. Tras la migración autorizada, `node scripts/qa/backend-live.mjs --run`: **OK**, incluidos conflicto concurrente, permisos, historial y limpieza técnica. Evidencia actualizada en `evidence/backend-live.json`.
- Dos intentos previos de concurrencia fallaron por timeout; ambos limpiaron fixtures. Se diagnosticó el estado de PostgreSQL sin encontrar transacciones pendientes. Después de corregir y aplicar la migración autorizada se ejecutó una verificación remota satisfactoria.
- YAML de los tres workflows y sintaxis Node de scripts modificados: válidos.
- Advisors de seguridad de solo lectura: dos WARN preexistentes sobre `public.rls_auto_enable()`, ejecutable por anon/authenticated. Revisar el propósito y privilegios antes de producción; no se alteró esa función.
- El dry-run mostró únicamente la nueva migración pendiente. Inicialmente se bloquearon aplicación y despliegue/configuración por revisión automática. Después, el usuario autorizó explícitamente solo la migración; esa aplicación y su prueba remota se completaron. Invitaciones, Auth y Vercel no se modificaron.

No se repitió el build completo ni las pruebas de diseño porque esta etapa no cambió el frontend. No se probaron login visual, correo, fotos desde dos dispositivos, backup Drive o restauración real durante esta etapa. Las pruebas previas de optimización son evidencia histórica, no una nueva ejecución.

## Pendientes indispensables

1. Concurrencia: resuelta y verificada tras autorización de la migración; no requiere más reintentos sin cambios nuevos.
2. Cuando el usuario quiera habilitar ingreso: configurar administrador personal, SMTP, URLs Auth y desplegar invitaciones; probar correo y recuperación.
3. Autorizar OAuth en Drive, custodiar age y cargar secretos en GitHub según ACTIVACION_DRIVE.
4. Ejecutar y verificar backups SQL/Storage en Drive y recuperar en un Supabase aislado. Validar que toda ruta referida por `cer_attachments` tenga un objeto recuperado.
5. Preparar Preview real con Auth y CORS exactos, validar escritorio/móvil y recién después autorizar publicación operativa.

**Listo para entregar a la clínica: NO.** La demo sigue disponible para inspección, pero no reemplaza el entorno operativo con cuentas reales y recuperación probada. La concurrencia ya quedó verificada.
