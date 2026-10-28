# Revisión de seguridad — alcance backend CER

## Resumen

El servicio real bloqueó administración por Enfermería, escalamiento de rol, acceso a módulos ajenos, escrituras anónimas y operación de perfiles desactivados en las pruebas técnicas. El servidor mantuvo autoría e historial. No se habilitó ingreso real ni acceso anónimo a tablas privadas. No se declara listo para producción.

## Hallazgos y bloqueos

1. **Resuelto, confiabilidad: conflicto concurrente sin respuesta utilizable.** La función original en `supabase/migrations/20261026194345_cer_backend.sql:194` usa 40001 para una revisión desactualizada; el servicio tuvo timeouts en la petición rechazada. Se preparó la migración no destructiva `20261028231130_conflict_http_status.sql:4`, validada localmente. La migración se aplicó con autorización expresa. La prueba remota posterior respondió HTTP 200 y HTTP 409/PT409 en 92 y 186 ms, sin timeout ni sobrescritura. El bloqueo de revisión impidió sobrescritura en las pruebas; no se observó pérdida de registros.
2. **Alto, continuidad: no existe respaldo/restauración remota acreditada.** `scripts/backups/backup.mjs:20` y `scripts/backups/storage.mjs:13` tienen implementación, pero faltan las credenciales y la ejecución real en Drive. Se reforzó validación de manifiestos y se comparan conteos del snapshot en recuperación. Sin restauración probada, se bloquea la entrega clínica.
3. **Pendiente de revisión de plataforma: dos WARN en `public.rls_auto_enable()`.** Advisors informa EXECUTE para anon y authenticated sobre una función SECURITY DEFINER preexistente. No está creada por las migraciones CER; no se modificó sin revisar su contrato y autorizar el cambio. Esto registra el aviso, no demuestra por sí solo que pueda explotarse.
4. **Acceso operativo pendiente por decisión del usuario.** El servicio de invitaciones (`supabase/functions/cer-invite/index.ts:13`) exige administrador activo antes de enviar correo. Sus pruebas locales no reemplazan validación de SMTP, URLs y recuperación real. La demo pública no debe recibir información real.

## Límites

La revisión se concentró en los flujos de datos, permisos y continuidad necesarios para entregar CER. No es una certificación ni una auditoría independiente. No se alteraron claves, políticas del servicio activo, proveedores o configuración de Vercel.

Referencias de los avisos: [anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Referencia del ajuste de estado: [errores de PostgREST](https://docs.postgrest.org/en/stable/references/errors.html).
