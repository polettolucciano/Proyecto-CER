# Arquitectura CER

## Composición

React 19, TypeScript y Vite. Se conserva la interfaz aprobada. `Application` separa biblioteca pública, acceso por Auth y panel privado. `AppProvider` coordina la persistencia; las reglas y formularios siguen agrupados por funcionalidad.

```text
Interfaz → casos de uso de features → WorkspaceRepository
                                      ├─ IndexedDB (demo)
                                      └─ SupabaseWorkspaceRepository
                                          → cer_workspace (lectura con RLS)
                                          → cer_apply_changes (comandos)
                                          → Storage privado (fotos)
```

La frontera Workspace permite conservar los componentes actuales. El adaptador calcula cambios por entidad; no reemplaza tablas completas. Auth y la biblioteca pública usan el cliente de Supabase directamente en sus límites de integración. No existe un servidor Node adicional.

## Esquema versionado

| Tabla | Contenido y relaciones principales |
|---|---|
| cer_modules | Definiciones JSON de formularios; catálogo sin registros ficticios |
| cer_profiles | UUID de auth.users, nombre, correo, rol, módulos y estado |
| cer_settings | Configuración y revisión global de escrituras |
| cer_equipment | Equipo/sector, módulo, código único y atributos |
| cer_tasks | Equipo/módulo, responsable, frecuencia, vencimiento, ancla y regla de avance |
| cer_records | Equipo/tarea, fecha, autor, valores, formulario original, resultado y revisiones |
| cer_attachments | Registro y ruta privada del archivo; no almacena sus bytes |
| cer_audit_events | Autor, momento y operación realizada |
| cer_training | Material HTTPS, metadatos y publicación |
| cer_private.operations | Operación por autor, huella del contenido y revisión confirmada |

Claves foráneas impiden referencias rotas. Equipo/tarea/módulo deben coincidir. Datos de presentación y atributos variables usan JSON; identidad, permisos, fechas y relaciones tienen columnas propias.

## Escrituras y concurrencia

El navegador no tiene permisos SQL directos de escritura. La RPC valida al usuario activo y su rol, bloquea la fila de revisión, comprueba la revisión esperada y ejecuta los comandos en una transacción. Registro, avance de tarea y auditoría se confirman juntos. Ante conflicto se requiere recargar: no se fusionan ni sobrescriben datos silenciosamente.

Una clave de operación estable permite repetir una solicitud sin duplicarla. Reutilizar esa clave con otro contenido se rechaza. Confirmar un control independiente en la misma fecha es una decisión distinta de reintentar un envío.

Este bloqueo global simplifica la integridad para el equipo inicial de aproximadamente diez personas. Puede causar conflictos entre cambios independientes; evaluar revisiones por entidad si la actividad lo requiere.

## Historial y fechas

Las rectificaciones crean nuevas filas y preservan valores y definición del formulario original. La anulación registra motivo, autor y momento, sin borrar. Los adjuntos vinculados no se borran desde cuentas operativas.

Fecha operativa: YYYY-MM-DD en America/Argentina/Cordoba. Instantes: timestamptz/UTC. Las tareas requieren elegir avance desde fecha prevista o realizada. Quincenal significa cada 15 días en esta implementación y se explica al configurar; no se da por confirmada una alternativa de dos fechas fijas.

## Permisos implementados para validar con CER

Administración gestiona equipos, tareas, perfiles, configuración, material y rectificaciones/anulaciones. Enfermería consulta y registra dentro de sus módulos. Usuario inactivo: sin acceso operativo. Anónimo: únicamente capacitación publicada.

Supervisor se conserva por compatibilidad de datos, sin permisos administrativos adicionales y sin nuevas invitaciones desde la interfaz. La matriz final requiere validación antes de operar datos reales.

## Límites actuales

La carga completa del workspace evita truncado REST silencioso, pero no implementa paginación de historia ni sincronización en tiempo real. Usar actualizar para ver cambios de otros usuarios. Las fotos se suben antes de guardar; una operación fallida puede dejar archivos privados sin vincular. Su limpieza queda pendiente de una política confirmada y nunca debe borrar evidencia vinculada.

Al añadir campos: actualizar catálogo y una nueva migración, conservar snapshots históricos, probar validación/lectura/exportación. No editar migraciones que ya estén aplicadas en un servicio.

