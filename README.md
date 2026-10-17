# Proyecto CER

Aplicación web para la gestión operativa de controles y mantenimiento del Centro de Enfermedades Renales.

## Estado actual

Esta versión es un **prototipo frontend**. Los datos se guardan en IndexedDB y permanecen solamente en el navegador donde fueron cargados. No existe todavía autenticación real, base de datos compartida ni autorización de servidor.

Funcionalidades disponibles:

- Pulso operativo con tareas vencidas, del día y próximas.
- Planificación en lista, calendario mensual y programa anual.
- Formularios documentados para grupo electrógeno, ósmosis diaria y loop.
- Evidencia fotográfica local.
- Historial con búsqueda, filtros, revisiones, rectificaciones y anulaciones trazables.
- Inventario de equipos y sectores.
- Perfiles y permisos de demostración.
- Informes por período y programa anual.
- Exportación XLSX con registros, verificaciones y trazabilidad.
- Biblioteca inicial de capacitaciones.

Los módulos Carro de paro, Fumigación, Electricidad, Salas y Otros mantenimientos conservan una ficha inicial hasta recibir y validar sus planillas específicas con CER.

## Desarrollo

```bash
npm install
npm run dev
```

## Verificaciones

```bash
npm run typecheck
npm test
npm run build
```

## Próxima etapa de infraestructura

La conexión futura con Supabase deberá incorporar Auth, PostgreSQL, Storage para evidencias, RLS por rol y módulo, auditoría, migraciones versionadas, pruebas de autorización y estrategia de copias de seguridad. No deben utilizarse datos operativos reales hasta completar y verificar esa etapa.

En el despliegue deberán configurarse además encabezados HTTP en la plataforma de hosting: `Content-Security-Policy`, `X-Content-Type-Options`, protección contra clickjacking, `Referrer-Policy` y `Permissions-Policy`. La política incluida actualmente en HTML es una defensa inicial para el prototipo, no reemplaza los encabezados del servidor.
