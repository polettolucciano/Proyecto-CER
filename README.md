# Proyecto CER

Gestión de equipos, controles, planificación e historial de mantenimiento del Centro de Enfermedades Renales.

## Estado real

Hay dos modos separados:

- **demo** (predeterminado): datos de ejemplo en IndexedDB, solo en ese navegador; selector de roles para presentación.
- **supabase**: adaptador, login, migraciones PostgreSQL, funciones transaccionales y políticas de Storage preparados en este repositorio. Exige una cuenta personal y configuración válida; no sustituye errores por datos de ejemplo.

**Todavía no se creó ni conectó un proyecto remoto.** Los workflows de respaldo están desactivados. No están comprobados el correo de invitación, la persistencia entre dispositivos ni una restauración real. La versión publicada sigue siendo la demo hasta un despliegue autorizado.

## Funcionalidades

Pulso operativo para Administración, calendario para Enfermería, inventario, tareas recurrentes, controles de grupo electrógeno/ósmosis/loop, fotos, búsqueda e historial, rectificaciones/anulaciones que preservan originales, reportes y exportación XLSX. Biblioteca pública de capacitaciones separada del panel privado.

Carro de paro, Fumigación, Electricidad, Salas y Otros conservan fichas iniciales hasta validar sus planillas. Las notificaciones operativas por correo/celular siguen pendientes; no son las alertas de infraestructura de los backups.

## Desarrollo local

```bash
npm ci
npm run dev
```

Sin variables se abre la demo. Para conectar **un entorno de pruebas**, seguir [Configuración de Supabase](docs/SETUP_SUPABASE.md). No migrar automáticamente los ejemplos del navegador.

## Verificación

```bash
npm run typecheck
npm run test:frontend
npm run test:backend
npm run test:backups
npm run build
```

Usar solo las comprobaciones relevantes para cada cambio. Las pruebas SQL emplean PostgreSQL embebido PGlite y roles de prueba: no reemplazan la integración con Auth y Storage reales. No hay un comando lint configurado.

## Documentación

- [Arquitectura y esquema](docs/ARCHITECTURE.md)
- [Supabase y usuarios](docs/SETUP_SUPABASE.md)
- [Variables de entorno](docs/ENVIRONMENT.md)
- [Backups, Drive/R2 y recuperación](docs/BACKUPS.md)
- [Despliegue, validación y reversión](docs/DEPLOYMENT.md)
- [Evidencia de QA](docs/QA_BACKEND.md)
- [Seguridad y riesgos pendientes](SECURITY.md)
- [Decisiones y alcance de implementación](docs/BACKEND_IMPLEMENTATION.md)

No activar datos reales ni producción antes de superar los pendientes documentados.
