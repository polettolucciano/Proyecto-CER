# Arquitectura de Proyecto CER

## Estado actual

CER sigue siendo un frontend demostrativo. IndexedDB confirma la persistencia únicamente en el navegador actual; no representa almacenamiento compartido, autenticación ni autorización real.

## Capas y responsabilidades

```text
app/                  contratos de navegación y composición general
features/             pantallas, formularios y casos de uso agrupados por negocio
modules/              catálogo y definiciones operativas de CER
shared/               interfaz, errores, hooks y utilidades reutilizables
infrastructure/       adaptadores técnicos, actualmente IndexedDB
demo/                 usuarios, tareas, equipos y registros de demostración
```

Las dependencias deben apuntar hacia las reglas del negocio:

```text
UI → caso de uso → reglas/validaciones → contrato de persistencia → adaptador
```

Un componente React no debe conocer IndexedDB ni, en el futuro, el cliente de Supabase. Tampoco debe coordinar por sí solo una escritura compuesta.

## Registro operativo

El registro de mantenimiento está separado en:

- `modules/catalog.ts`: formularios y referencias confirmadas o explícitamente pendientes.
- `features/records/domain`: validaciones puras y reglas de integridad.
- `features/records/application`: creación, rectificación, actualización de tarea y auditoría.
- `features/records/ui`: representación e interacción. La migración de los componentes visuales continúa dentro de la carpeta de la funcionalidad.
- `infrastructure/persistence`: contrato transitorio y adaptador IndexedDB.

Una medición numérica válida se conserva aunque esté fuera de la referencia. El resultado puede marcarse para observación, pero la entrada no se corrige ni descarta automáticamente.

## Persistencia local

`WorkspaceRepository` es una frontera transitoria para conservar compatibilidad con los datos locales existentes. El `AppProvider` recibe el repositorio por inyección, por lo que puede probarse con otra implementación.

Antes de Supabase se reemplazarán las escrituras genéricas del workspace por comandos orientados al negocio. Una operación compuesta, como registrar un control y avanzar su tarea, deberá ejecutarse atómicamente.

## Convenciones

- Fechas operativas: `YYYY-MM-DD` en `America/Argentina/Cordoba`.
- Instantes de creación y auditoría: ISO 8601/UTC.
- Registros operativos: historial inmutable; correcciones mediante nuevas revisiones.
- Módulos no definidos: permanecen pendientes, sin checklists inventados.
- Permisos del prototipo: sirven para demostrar UX, no son seguridad real.
- Errores: se clasifican en validación, permisos, autenticación, persistencia, red, conflicto e inesperados.

## Cómo agregar un módulo confirmado

1. Validar la planilla y frecuencia con CER.
2. Incorporar su definición en `modules/catalog.ts`.
3. Agregar metadatos operativos en `modules/recordModules.ts` cuando corresponda.
4. Añadir validaciones propias sin convertirlas en reglas de otros módulos.
5. Crear pruebas para obligatorios, valores reales fuera de referencia y casos límite.
6. Probar el flujo en celular y escritorio.

