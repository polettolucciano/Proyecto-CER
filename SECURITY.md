# Seguridad CER — revisión de esta etapa

Actualización 27/10/2026: el proyecto remoto está creado y tiene las tres migraciones aplicadas. Se verificó RLS en todas las tablas CER y el bucket privado. El nuevo procesador valida contenido binario, decodifica, limita recursos y recodifica antes de guardar; retira la subida directa para evitar bypass. La validación remota del flujo de fotos se registra en PHOTO_OPTIMIZATION. Los riesgos históricos sobre Auth/backup deben releerse con esta actualización; las pruebas de correo, recuperación y operación completa entre dispositivos siguen pendientes.

El asesor remoto señala grants amplios de la función de infraestructura preexistente public.rls_auto_enable. Es un pendiente de revisión antes de producción; no se modificó esa configuración ajena a los cambios de fotos.

Fecha: 26/10/2026. Alcance: Auth, persistencia, SQL/RLS, invitaciones, evidencias, configuración, dependencias y preparación de backups. Revisión local; no auditoría de un servicio desplegado. **No habilitado todavía para datos operativos reales.**

## Controles presentes en código

- Modos demo y conectado separados; el conectado falla explícitamente sin generar usuarios administrativos ficticios.
- Roles en cer_profiles, no en metadata editable del usuario. Perfil inactivo sin operaciones privadas.
- RLS y grants mínimos en tablas expuestas; sin escrituras directas para usuarios del navegador.
- RPC con validación, transacciones, revisión optimista e idempotencia por usuario/operación.
- Rectificaciones inmutables, anulaciones con motivo y autoría calculada en servidor.
- Referencias equipo/tarea/módulo, campos obligatorios y valores numéricos validados; no se alteran mediciones fuera de referencia.
- Formularios originales guardados por registro; lectura, rectificación y exportación usan el snapshot.
- Fotos en bucket privado, límites MIME/tamaño, permisos por módulo/autor y URL firmada temporal. No se borran objetos vinculados mediante permisos de usuarios operativos.
- Funciones privilegiadas con search_path explícito y sin ejecución pública. service_role solo en el entorno Edge.
- cer-invite comprueba identidad/administrador antes de invitar; reintenta únicamente un conflicto conocido de perfil.
- Capacitaciones publicadas accesibles sin cuenta; borradores solo Administración.
- CSP y encabezados de hosting versionados; falta comprobarlos en el deploy real.
- Backups preparados con cifrado age, verificación SHA-256, rotación separada y restauración dirigida a un entorno de pruebas.

## Evidencia local

Ocho pruebas de PostgreSQL con roles authenticated/anon: acceso entre módulos, intentos de administración y escalado, autoría, campos inválidos, duplicados, revisión obsoleta, idempotencia, conservación del original, avance/rollback de recurrencia, biblioteca y políticas de objetos.

Se detectó y corrigió una referencia ambigua en la política Storage que podía permitir borrar una evidencia histórica. La prueba ahora verifica que no se borra. Las pruebas emulan las tablas/identidad de Supabase; no prueban el servicio HTTP ni la validación criptográfica de JWT.

Escaneo de patrones de claves secretas, claves privadas y refresh tokens en archivos candidatos a Git: cero coincidencias. Es una comprobación acotada, no una garantía exhaustiva.

## Dependencias

La auditoría de producción ejecutada en esta etapa reportó **0 vulnerabilidades conocidas**. Se corrigió la dependencia transitiva de ExcelJS mediante override de uuid 11.1.1, sin downgrade forzado de ExcelJS. Se comprobó escritura y lectura de un XLSX. No se afirma que todas las dependencias de desarrollo hayan pasado una auditoría equivalente.

## Riesgos y condiciones de lanzamiento

| Prioridad | Pendiente | Mitigación / evidencia necesaria |
|---|---|---|
| Alta | Supabase remoto no existe/configurado | Probar Auth, RLS con API directa, dos dispositivos y revocación real |
| Alta | No hay copia remota ni recuperación demostrada | Activar SQL y archivos, restaurar aislado y validar acceso/contenido antes de producción |
| Alta | Correos y función de invitación sin prueba real | Configurar SMTP/redirects, verificar invitación, recuperación y fallos parciales |
| Media | MIME/tamaño no verifican el contenido binario real de fotos | Confirmar comportamiento del servicio; agregar inspección/normalización confiable si se requiere validación de formato real |
| Media | Permisos finos y retención no aprobados definitivamente | Validar matriz con CER antes del uso real; no borrar registros históricos |
| Media | Sesión de SPA persistida en navegador | CSP, no HTML arbitrario y equipos de confianza; acordar política de sesiones/dispositivos |
| Media | Fotos subidas antes de una transacción fallida pueden quedar huérfanas | Mantener privadas y definir limpieza auditada; no borrar archivos vinculados |
| Media | Cuenta Auth invitada puede quedar sin perfil si falla la segunda operación | Sin perfil no obtiene acceso; procedimiento asistido documentado en SETUP_SUPABASE |
| Media | Sin observabilidad central de errores de la web ni watchdog externo | Configurar responsable/canal y prueba de recepción de fallos |
| Media | Límites de volumen y revisión global | Probar carga y contención; paginar historial al crecer |
| Baja | Bundle principal y ExcelJS grandes | ExcelJS ya se carga bajo demanda; evaluar separación adicional si las mediciones lo justifican |

El metadato must_change_password solo guía la pantalla de incorporación; no es autorización ni una política de contraseña obligatoria impuesta por el servidor. Las URLs, secretos, SMTP y controles de Auth alojados deben configurarse y revisarse en Supabase.

## Antes de datos reales

- [ ] Completar el entorno de pruebas y resolver riesgos altos.
- [ ] Validar con CER permisos de rectificación/anulación y reglas de recurrencia.
- [ ] Probar llamadas directas no autorizadas, usuario inactivo y manipulación de payload.
- [ ] Verificar que una cuenta no lea fotos de módulos ajenos ni elimine evidencia histórica.
- [ ] Probar conflictos simultáneos entre dos sesiones reales.
- [ ] Confirmar backups, alertas y restauración incluyendo bytes de fotografías.
- [ ] Revisar encabezados y secretos en el despliegue aprobado.
- [ ] Nombrar responsables de acceso, incidentes y recuperación.

No interpretar este documento como autorización de despliegue ni como declaración de ausencia de errores.
