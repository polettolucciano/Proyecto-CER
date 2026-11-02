# CER — revisión de seguridad y casos de abuso

Fecha: 02/11/2026. Alcance: React/Vite, RPC PostgreSQL, permisos, invitaciones, fotografías, exportación y recuperación. No se utilizaron datos de pacientes ni cuentas reales de Enfermería.

## Resumen y estado real

Supabase Proyecto-CER (`pnqsvmtmkceznoswpgfz`) fue reactivado por pedido expreso del usuario. Management API/CLI informó `ACTIVE_HEALTHY`, Auth respondió HTTP 200 y PostgreSQL confirmó cuatro migraciones, RLS activo y cero perfiles, equipos y registros operativos. La web pública permanece en demo, sin ingreso, como se había solicitado.

Las correcciones nuevas están implementadas y probadas **localmente**, pero la quinta migración `20261102194118_security_validation.sql` no está aplicada al servicio. No se desplegaron funciones ni Vercel. Por tanto, no se presenta este informe como acreditación de que todas las protecciones nuevas estén activas remotamente.

## Hallazgos reproducidos y correcciones preparadas

### S1 — Media: resultados inválidos convertidos en Conforme

La función original calculaba el resultado comparando solamente si era `attention`; una entrada desconocida se almacenaba como `ok`. La prueba adversarial reprodujo la aceptación. La migración nueva exige una cadena `ok` o `attention` antes de escribir (`supabase/migrations/20261102194118_security_validation.sql:9`). Conserva la regla de marcar observaciones cuando una verificación informa MAL; no inventa umbrales médicos.

Estado: corregido localmente, pendiente aplicación remota. Requiere una cuenta activa con acceso al módulo; no se observó un acceso anónimo.

### S2 — Media: campos estructurados donde debía haber texto

`equipment.data` y `tasks.data` admitían objetos JSON en nombre, ubicación, modelo o título porque el CHECK medía su conversión textual, pero luego se devolvía el objeto original. Esto podía romper el renderizado. Además, asignar un objeto con propiedad `formula` a ExcelJS tiene un significado diferente de asignar texto; era una ruta potencial de manipulación de exportaciones desde metadatos alterados.

Se reprodujo la aceptación de objetos. La migración exige tipos string para los metadatos usados en equipos, tareas y capacitaciones, y boolean para publicación (`20261102194118_security_validation.sql:17`, `:22`, `:27`). El acceso a esas modificaciones ya requería Administración; no se atribuye capacidad de modificar equipos a Enfermería.

Estado: corregido y probado localmente. No se ejecutaron fórmulas ni se visitaron direcciones del payload. Las cadenas que parezcan HTML se comprobaron como texto literal en la interfaz.

### S3 — Media: ventana de borrado de fotografías antes de vincularlas

La política anterior impedía borrar evidencias ya vinculadas, pero permitía DELETE de objetos propios todavía sin vínculo. La prueba reprodujo ese borrado. Esa capacidad puede competir con el guardado del registro y dejar una referencia rota si ambos procesos se solapan.

La migración retira `cer_evidence_cleanup` para los clientes (`20261102194118_security_validation.sql:35`). No borra archivos. Los objetos privados sin vincular requerirán una limpieza explícita del servidor; la aplicación no utiliza borrado directo para quitar una foto de un borrador. El dump de políticas de recuperación conserva esta restricción (`scripts/backups/backup.mjs:33`).

Estado: preparado y probado localmente. La carrera completa de dos servicios no se reprodujo en producción; se verificó la capacidad de borrado que la hacía posible.

### S4 — Media: solicitudes de invitación leídas completas antes del límite

La función usaba `request.text()` antes de comprobar el largo y contaba caracteres, no bytes. Ahora valida MIME y tamaño declarado, cuenta los bytes recibidos, cancela el stream al exceder 20.000 bytes y rechaza UTF-8/JSON inválido (`supabase/functions/_shared/requestBody.ts:7`). Mantiene las comprobaciones de identidad y administrador antes de leer el cuerpo. Las respuestas de invitaciones no se deben cachear.

Estado: corregido y probado localmente, pendiente despliegue cuando se habilite el ingreso. No se envió ningún correo en las pruebas.

### S5 — Baja, defensa adicional: archivos extra en una recuperación de Storage

La recuperación comprobaba los archivos enumerados, pero podía copiar también objetos extra presentes en el archivo extraído. Ahora exige coincidencia exacta entre inventario y contenido: rutas únicas y normalizadas, tamaño, SHA-256, ausencia de archivos extra/faltantes y conteo del manifiesto (`scripts/backups/storageIntegrity.mjs:3`). Esto complementa cifrado, hashes, inspección del tar y rechazo previo de enlaces.

Estado: corregido y probado localmente. No equivale a una restauración real desde Drive, que sigue pendiente de credenciales y entorno aislado.

### S6 — Baja, reducción de superficie: permisos innecesarios de un helper de plataforma

Advisors sigue reportando dos WARN sobre `public.rls_auto_enable()`. Se leyó su definición real: es un helper `event_trigger` que habilita RLS al crear tablas públicas, con search_path restringido. No es un RPC de CER y no se demostró un bypass de permisos a través suyo.

La migración preparada comprueba que conserve ese tipo y retira EXECUTE de PUBLIC, anon y authenticated. No elimina el helper, no cambia su cuerpo ni desactiva RLS; conserva los permisos del propietario. La prueba verifica este contrato. Los WARN remotos no se consideran resueltos hasta aplicar y volver a comprobar Advisors.

## Riesgos pendientes que no se ocultan

- **Dependencias:** npm audit reportó ocho entradas moderadas en la cadena ExcelJS/archiver/glob/minimatch, sin altas ni críticas en esa consulta. El aviso raíz consultado es GHSA-g3hv-75wg-m249. La app usa la entrada browser de ExcelJS, cuyo bundle inspeccionado no contiene los nombres minimatch/firstPhasePreProcess; no se encontró una ruta desde entradas del usuario a patrones glob. Esto limita la exposición identificada, pero no elimina el aviso. No se forzó minimatch 11 sobre consumidores antiguos ni se degradó ExcelJS a ciegas: ambas opciones requieren validar compatibilidad.
- **Cargas repetidas:** hay límites por archivo y por registro, autorización y reencodificación raster. No existe aún una cuota agregada propia por usuario para cargas reiteradas. Definir y probar esa política antes de abrir uso real; no se simularon ataques volumétricos contra servicios externos.
- **Identidades:** las cuentas individuales y la configuración de Auth/SMTP, recuperación, registro público y MFA de Administración siguen pendientes de la etapa de ingreso. El config.toml local no acredita la configuración alojada. No se retiraron controles para dejar datos reales abiertos.
- **Backups:** Google Drive y la restauración aislada aún no están operativos/verificados. Esto sigue bloqueando una entrega clínica.
- **Autoría física:** una cuenta individual, la auditoría y las correcciones inmutables ayudan a detectar responsabilidad. El software no prueba por sí solo que alguien haya realizado físicamente el mantenimiento ni impide una declaración deliberadamente falsa. CER necesita revisión de observaciones, formación y un procedimiento de supervisión confirmado.
- **Disponibilidad:** reactivar el proyecto no modifica su plan ni elimina las pausas por inactividad del plan gratuito. No se contrataron servicios ni se crearon automatismos para eludir esa política.

## Referencias consultadas

- [OWASP API Security Top 10](https://api-security.owasp.org/editions/2023/en/0x00-header/): acceso indebido a objetos/funciones y consumo de recursos.
- [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): límites, autorización y validación real del contenido.
- [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html): verificaciones del servidor y protección de operaciones.
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) y [Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).
- [Aviso GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
- [Pausas de Supabase](https://supabase.com/docs/guides/platform/free-project-pausing).
- [Advisor anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [Advisor authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

No es una certificación de ausencia de vulnerabilidades. El detalle de pruebas y sus límites está en QA_SEGURIDAD_2026-11-02.md.
