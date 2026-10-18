# Plan de integración futura con Supabase

Este documento es una propuesta técnica. No existe conexión con Supabase, no se aplicaron migraciones y no deben cargarse datos operativos reales todavía.

## Servicios previstos

- Supabase Auth para identidad y sesiones.
- PostgreSQL para equipos, tareas, controles, permisos, auditoría y capacitaciones.
- Storage privado para evidencias.
- RLS y grants explícitos para autorización real.
- Migraciones versionadas y pruebas pgTAP de permisos.

## Modelo propuesto

| Entidad | Responsabilidad |
|---|---|
| `profiles` | Datos del usuario vinculados a `auth.users` |
| `modules` | Catálogo de módulos operativos |
| `profile_module_permissions` | Acceso explícito por usuario y módulo |
| `equipment` | Equipos y sectores controlados |
| `maintenance_tasks` | Programación, frecuencia y próxima fecha |
| `maintenance_records` | Registro inmutable, autoría, versión y valores observados |
| `record_attachments` | Metadatos de evidencias almacenadas en Storage |
| `audit_events` | Acciones relevantes y referencias a entidades |
| `training_materials` | Biblioteca interna y contenidos publicados |
| `settings` | Configuración operativa confirmada del centro |

Los valores específicos del formulario pueden almacenarse como `jsonb` junto con `module_key` y `form_schema_version`. Las columnas necesarias para filtrar, autorizar o relacionar información no deben quedar ocultas dentro de JSON.

## Integridad y concurrencia

- Identificadores UUID generados de forma segura.
- `timestamptz` para instantes y `date` para la jornada operativa.
- Claves foráneas e índices en columnas de relación, filtros y políticas RLS.
- Código de equipo único según el alcance que confirme CER.
- `operation_id` único para idempotencia de escrituras.
- Versión o marca de actualización para detectar conflictos de edición.
- Registro, avance de tarea y auditoría dentro de una misma transacción o función controlada.
- Rectificaciones mediante inserción de una revisión y referencia al registro anterior; no sobrescritura destructiva.
- Paginación por cursor para historiales extensos.

La detección de un posible duplicado no equivale a bloquearlo: puede existir más de un control legítimo. Se debe conservar la advertencia, exigir confirmación y usar idempotencia para diferenciar un doble envío accidental.

## Autorización

Todas las tablas expuestas tendrán RLS y grants mínimos. Las políticas se escribirán por operación (`select`, `insert`, `update`, `delete`) y se probarán tanto para accesos permitidos como denegados.

- `anon`: solamente capacitaciones expresamente publicadas.
- `authenticated`: lectura/escritura limitada por estado del perfil, módulo y permiso confirmado.
- Administración: operaciones adicionales según matriz aprobada por CER.
- Evidencias: bucket privado y rutas no controladas directamente por nombres de archivo del usuario.
- `service_role`: exclusivamente en infraestructura confiable; nunca en el navegador.

Los roles actuales —Administrador, Supervisor y Responsable técnico— son una propuesta demostrativa y no se convertirán en políticas definitivas hasta validarlos con CER.

## Migraciones previstas

1. Extensiones y funciones estrictamente necesarias.
2. Tablas, tipos, claves foráneas y restricciones.
3. Índices.
4. Funciones transaccionales e idempotencia.
5. Grants y RLS.
6. Storage y políticas de objetos.
7. Datos mínimos de catálogo, separados de datos de demostración.
8. Pruebas pgTAP para cada política.

## Preguntas bloqueantes

- Matriz definitiva de roles, módulos y operaciones.
- Quién puede rectificar, anular y leer auditorías.
- Frecuencia exacta de Loop.
- Conservación y eliminación de registros y evidencias.
- Tipos, cantidad y tamaño definitivo de archivos.
- Necesidad de sedes múltiples.
- Datos que CER considera sensibles y obligaciones regulatorias aplicables.
- Alcance y canal de futuras notificaciones.

