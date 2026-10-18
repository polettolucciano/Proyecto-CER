# Estado de seguridad — Proyecto CER

## Resumen ejecutivo

La versión actual es un prototipo frontend y **no está autorizada para operar con datos reales**. No se detectaron usos de `dangerouslySetInnerHTML`, `eval`, `document.write`, mensajes entre ventanas ni credenciales incluidas en el código. Se incorporó una CSP inicial, validación de enlaces HTTPS, tipos permitidos para imágenes y un modelo local de rectificación/anulación sin borrado.

Los siguientes puntos bloquean un lanzamiento operativo hasta que exista backend.

## Riesgo alto

### SEC-001 — Autorización solamente visual

- Ubicación: `src/domain.ts`, `src/store.tsx`.
- Evidencia: el perfil se selecciona en estado React y `allowed` filtra la interfaz.
- Impacto: cualquier persona con acceso al navegador podría elegir otro perfil o modificar datos locales.
- Corrección requerida: Supabase Auth y políticas RLS por rol y módulo; probar también accesos directos no autorizados.
- Estado: pendiente de backend. La interfaz lo identifica como demostración.

### SEC-002 — Persistencia local sin respaldo ni aislamiento multiusuario

- Ubicación: `src/infrastructure/persistence/local/IndexedDbWorkspaceRepository.ts`.
- Evidencia: registros y fotografías se guardan juntos en IndexedDB.
- Impacto: pérdida por limpieza del navegador, acceso desde el mismo perfil del dispositivo y ausencia de recuperación central.
- Corrección requerida: PostgreSQL y Storage con RLS, copias de seguridad, restauración probada y política de conservación.
- Estado: pendiente de backend.

## Riesgo medio

### SEC-003 — Evidencias validadas solamente en cliente

- Ubicación: `src/features/records/domain/recordValidation.ts` y `src/features/records/OperationalRecordForm.tsx`.
- Evidencia: el frontend limita MIME y tamaño, pero no existe servidor que vuelva a validarlos.
- Impacto: la futura carga remota sería evadible si se confiara solamente en esta validación.
- Corrección requerida: validar tamaño, tipo real, extensión y autorización en Storage/servidor; generar nombres no controlados por el usuario.
- Estado: control de UX implementado; seguridad del servidor pendiente.

### SEC-004 — Encabezados finales dependen del hosting

- Ubicación: `index.html:5-6`.
- Evidencia: existe CSP inicial mediante `meta`, pero `frame-ancestors`, `X-Content-Type-Options` y `Permissions-Policy` requieren configuración del servidor o CDN.
- Impacto: defensas incompletas contra XSS, clickjacking y abuso de capacidades del navegador.
- Corrección requerida: configurar y verificar encabezados HTTP en el deploy.
- Estado: mitigación inicial incorporada; verificación de hosting pendiente.

## Dependencias

`npm audit --omit=dev` informa una vulnerabilidad moderada transitiva en `uuid@8.3.2`, utilizada por `exceljs@4.4.0`. La corrección automática propuesta baja ExcelJS a una versión mayor incompatible, por lo que no se aplicó `--force`. Antes de producción se debe actualizar o sustituir la librería de exportación y volver a ejecutar la auditoría.

## Controles implementados

- IDs aleatorios mediante `crypto.randomUUID()`.
- Enlaces de capacitación limitados a HTTPS y normalizados al cargar datos.
- Sin renderizado de HTML arbitrario.
- Fotografías limitadas a JPG, PNG y WebP; no se admite SVG/HTML.
- Rectificaciones y anulaciones preservan las versiones anteriores.
- Política CSP inicial sin `unsafe-eval` ni scripts inline.
- Lockfile versionado y comandos separados para typecheck, tests y build.
