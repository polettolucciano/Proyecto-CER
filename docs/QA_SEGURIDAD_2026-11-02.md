# Evidencia de seguridad y QA — 02/11/2026

## Criterios

Impedir escalamiento de rol y acceso a módulos ajenos; mantener autoría, historia e idempotencia; rechazar estructuras inválidas y cargas excesivas; conservar evidencias; no recuperar archivos fuera del inventario ni sobrescribir el origen.

## Pruebas locales: 65 aprobadas en conjunto

| Grupo | Resultado | Alcance real |
|---|---|---|
| Vitest (`src`, `imageOptimization`, `requestBody`) | 30/30 | Dominio, persistencia, reportes, optimización raster y streams JSON |
| PostgreSQL emulado (`tests/backend.test.mjs`) | 17/17 | RLS, autoría, límites, transacciones, idempotencia, revocación, fotos, metadatos y privilegios |
| Backups (`tests/backups.test.mjs`) | 9/9 | Rotación, antigüedad, hashes/manifiestos, destino aislado e inventario exacto |
| Invitaciones (`tests/invitations.test.mjs`) | 5/5 | Handler con Auth y correo simulados; roles, origen, entrada y reintentos |
| Evidencias (`tests/evidence-handler.test.mjs`) | 4/4 | Handler con Storage/decodificador simulados; acceso, rutas, límites y reuso |

Se ejecutó `npm test` como comprobación general de seguridad solicitada. Después se ejecutaron solo backend e invitaciones, afectados por los ajustes posteriores: la cuenta anterior de 63 pasó a 65 casos. No se repitieron los demás grupos sin cambios. TypeScript del frontend pasó. Las dos Edge Functions también pasaron comprobación estática de tipos con las bibliotecas instaladas y una declaración mínima del runtime Deno; no es una ejecución en la plataforma.

Antes de corregir se reprodujeron rechazos ausentes para resultado desconocido, borrado de foto sin vínculo y objetos en metadatos. Después de las correcciones pasaron. El primer intento de probar el handler de fotos falló por `import.meta` en el arnés VM; se corrigió la URL del loader simulado, sin alterar el optimizador por ese motivo.

## Navegador local

Instancia aislada de demo en `http://127.0.0.1:5180`; no se usó Supabase para estas interacciones.

- Guardar un equipo sin datos obligatorios mantuvo el formulario abierto.
- Un nombre con etiqueta `<img>` y handler de consola quedó como texto literal; no se creó esa imagen ni apareció el marcador de ejecución en consola.
- Un código repetido mostró “Ya existe un equipo con ese código”.
- El perfil Enfermería redirigió el intento de abrir `#users` al inicio y no mostró alta de personas.
- El calendario quedó disponible para Enfermería y no mostró Programar tarea.
- En el ancho estrecho real observado (319 px), el calendario permaneció utilizable; se detectó 1 px de diferencia de redondeo entre ancho cliente y scroll, sin elementos del main que se extendieran más de 1 px. No se presenta como desborde significativo ni se modificó CSS por ello.
- La consola no mostró errores durante estos recorridos.

Las dimensiones solicitadas al proveedor de navegador no siempre coincidieron con el viewport efectivo. Las capturas se etiquetan por escenario, no como acreditación de una resolución de escritorio específica. Las restricciones visuales de la demo no sustituyen las pruebas de permisos SQL.

Evidencia: `evidence/security-ui-xss-2026-11-02.jpg`, `evidence/security-ui-narrow-2026-11-02.jpg`.

## Servicios reales

- Proyecto exacto confirmado: `pnqsvmtmkceznoswpgfz`.
- Reactivación desde “Project is paused” → Resume → `ACTIVE_HEALTHY`; panel Healthy.
- Auth `/health`: HTTP 200.
- PostgreSQL: cuatro migraciones aplicadas, RLS de tablas CER activo, cero perfiles/equipos/registros operativos.
- Advisors: dos WARN sobre `public.rls_auto_enable()`. Se inspeccionó su definición y tipo `event_trigger`; su corrección de permisos está preparada, no aplicada.
- `npm audit`: ocho entradas moderadas, sin altas/críticas; ver evaluación y límites en el informe de seguridad.

Captura de reactivación: `evidence/supabase-reactivated-2026-11-02.jpg`. Los errores agregados visibles durante el arranque no se interpretan como prueba de fraude ni como ausencia de incidentes; no se realizó análisis exhaustivo de logs de plataforma en esta etapa.

## Actualización tras autorización y aplicación remota

Se aplicó la quinta migración `20261102194118_security_validation.sql` al proyecto exacto. La primera ejecución de QA se detuvo en setup por timeout del CLI y confirmó limpieza; una consulta SQL aislada respondió correctamente con cero perfiles. La siguiente ejecución secuencial terminó OK: validaciones adversariales, RLS, permisos administrativos, privilegios del helper, restricción de borrado de fotos, autoría, persistencia, historial, rectificación, anulación, cierre de sesión y concurrencia. Las dos escrituras simultáneas respondieron HTTP 200 y HTTP 409 en 90 y 102 ms respectivamente. La evidencia `evidence/backend-security-live.json` confirma limpieza de datos técnicos.

Advisors de seguridad ya no reporta los dos avisos del helper. Queda el aviso `auth_leaked_password_protection`, pendiente de configuración de Auth antes de uso real. No se habilitaron cuentas operativas ni se desplegó la función de invitaciones.

## Pendientes del diagnóstico inicial (puntos 1 y 2 completados arriba)

1. Autorizar y aplicar `20261102194118_security_validation.sql`, no destructiva de datos, que restringe validaciones y permisos.
2. Ejecutar `node scripts/qa/backend-live.mjs --run --security` en el proyecto todavía vacío; verifica las nuevas entradas adversariales, privilegios y regresión con fixtures temporales. Está preparado y **no se ejecutó** contra el esquema remoto anterior.
3. Desplegar y probar invitaciones con la configuración de Auth/SMTP cuando se habilite el ingreso. El optimizador no se rediseñó ni se desplegó de nuevo.
4. Completar pruebas de cuentas reales controladas, recuperación de acceso, cuotas de archivos y restauración de backups SQL/Storage en un proyecto aislado.

No se instalaron dependencias, no se modificaron credenciales, no se publicó Vercel y no se guardaron secretos en las evidencias. La clínica todavía no debe usar la demo para registros reales.
