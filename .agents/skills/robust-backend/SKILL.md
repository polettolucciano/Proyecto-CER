---
name: robust-backend
description: Diseñar, programar y auditar backend, API, autenticación, base de datos, reservas, pagos y procesos críticos con foco en confiabilidad, seguridad y casos límite.
---
# Backend sólido y defensivo

1. Auditar stack, modelos, integraciones y flujos de negocio actuales. Escribir invariantes y criterios de aceptación antes de cambiar lógica crítica.
2. Modelar estados, transiciones, contratos API y restricciones en BD. Validar inputs en servidor, controlar errores con mensajes útiles, registrar sin filtrar secretos ni datos sensibles.
3. Diseñar autenticación y autorización por recurso/rol en el servidor; mínimo privilegio. Revisar IDOR/BOLA, inyección, CSRF según modelo de sesión, rate limiting, CORS, gestión de secretos y dependencias.
4. Tratar escritura de datos como operación susceptible a concurrencia: transacciones, restricciones únicas, idempotencia cuando sea pertinente, reintentos acotados y manejo de fallas parciales.
5. Para reservas: validar solapamientos y carreras desde BD/servidor, zonas horarias, cancelaciones, expiraciones y doble confirmación. No confiar solo en bloquear botones.
6. Para dinero: importes en enteros de unidad menor o decimal exacto; verificar webhook firmado, estado de pago en fuente confiable y reintentos/idempotencia; nunca almacenar números completos de tarjeta.
7. Preparar migraciones reversibles si es factible, índices con base en consultas, backups y plan de rollback; no operar datos reales ni producción sin permiso.
8. Cubrir pruebas de contrato, integración, autorización, concurrencia, negativos y límites. Simular servicios externos y probar fallos/red lenta; correr pruebas y reportar resultados reales.
9. Revisar observabilidad: logs estructurados, IDs de correlación, alertas, métricas útiles, health checks y manejo de errores sin exposición interna.
10. Entregar registro de riesgos (severidad, mitigación, evidencia, pendiente) y definir qué impide el lanzamiento.

No prometer ausencia de errores; usar controles y pruebas proporcionados al riesgo.
Referencias de revisión: OWASP ASVS, OWASP API Security Top 10 y documentación oficial del framework actual.
