# Simplificación por sectores — 04/11/2026

## Requisitos confirmados en la conversación
- Enfermería y Administración inician en tarjetas de equipos y sectores.
- Cada tarjeta ofrece realizar un nuevo control o consultar el historial de ese sector.
- El historial general se conserva en su propia pantalla; los próximos controles se consultan en Planificación.
- Renombrar Agenda a Planificación e Informes a Cronograma.
- Separar Capacitaciones en una URL propia, `/capacitaciones`.
- Al cargar material, elegir o escribir módulo principal y submódulo, por ejemplo «Aprender a manejar / Partes del motor».
- Priorizar sencillez y reducir contenido secundario en el inicio.

## Implementación
- Se reutiliza el catálogo de equipos y sectores existente, respetando el filtrado de módulos del perfil.
- Inicio con buscador y dos acciones por tarjeta. Se conserva la ficha administrativa en Administrar equipos, con sus filtros de módulo y estado.
- El resumen anterior permanece en Administración y más → Resumen del centro.
- Historial filtrado por identificador de equipo, además del módulo. El filtro se incluye en el enlace y se puede limpiar para volver al historial general. Exportar utiliza la lista filtrada existente.
- Formulario de control preselecciona módulo y equipo. Se conservan campos y periodicidades de cada procedimiento: no todos son diarios.
- Biblioteca pública por ruta independiente, compatible con el enlace anterior `#public-training`. Se preparó la reescritura de `/capacitaciones` y `/capacitaciones/` a index.html en la configuración de hosting.
- Categoría existente se conserva como módulo principal; submódulo es un campo adicional opcional para datos antiguos, requerido al cargar/editar desde el formulario nuevo. No se modifica ni elimina material anterior.
- Selectores dependientes de módulo/submódulo, búsqueda y tipos de material. Los filtros públicos se construyen exclusivamente desde materiales publicados.
- Se retiró el banner decorativo de la biblioteca de gestión y se evita reservar espacio para acciones vacías en los encabezados.

## Verificación ejecutada
- `npm run test`: 9 archivos / 30 pruebas Vitest aprobadas; 44 pruebas Node aprobadas, incluidas las existentes de backend y biblioteca pública.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado. Persiste el aviso de archivos JavaScript mayores a 500 kB (principal y ExcelJS).
- `git diff --check`: aprobado.
- Navegador integrado real en modo `VITE_DATA_MODE=demo`, servidor local. Playwright CLI no pudo iniciar porque Chrome no está instalado; se utilizó el navegador integrado con sus controles y API Playwright.
- Se cambiaron perfiles de Administrador y Enfermería: ambos muestran tarjetas como inicio; administración conserva Cronograma y sus herramientas adicionales.
- Tarjeta de Grupo electrógeno → historial con módulo e identificador de equipo en la URL y selector del equipo preseleccionado.
- Tarjeta de Ósmosis → formulario diario con planta preseleccionada. Se cerró sin guardar: no se registró un mantenimiento ficticio.
- Búsqueda de sector inexistente → estado vacío; limpiar → se recuperan las tarjetas.
- Acceso a Planificación y Cronograma mediante navegación visible.
- Carga local de «PRUEBA QA · Partes del motor», módulo «Aprender a manejar», submódulo «Partes del motor», enlace example.com. Guardado, edición, filtros dependientes y consulta pública verificados.
- `/capacitaciones` abre directamente y conserva el contenido al recargar.
- Búsqueda pública sin coincidencias → estado vacío; limpiar filtros → recupera recursos.
- Se pasó el material de prueba a borrador: desaparece de la biblioteca pública y sus módulos dejan de aparecer en los filtros públicos. El borrador permanece únicamente en el navegador local de QA.
- Revisión visual de inicio a 390 y 1440 px; biblioteca pública a 390 px. Comprobación DOM sin desborde horizontal en inicio a 390 y 768 px y biblioteca pública a 390 px.
- Consola consultada en la sesión: sin errores ni advertencias registrados.

## Evidencia
- `output/playwright/sectores-movil-2026-11-04.png`
- `output/playwright/sectores-escritorio-2026-11-04.png`

## Límites y pendientes
- No hubo despliegue ni cambios en producción, migraciones, políticas o credenciales.
- Los recorridos del navegador se ejecutaron con almacenamiento local de demostración. No se comprobó la conexión ni el guardado de estos cambios contra un proyecto Supabase real.
- Las pruebas de backend corrieron sobre el entorno automatizado existente; no equivalen a una auditoría completa de seguridad ni de producción.
- No se repitieron subida de fotos, exportación descargada, red caída o toda la regresión de formularios operativos: se reutilizan los componentes existentes.
- La verificación de la reescritura de hosting publicada queda pendiente de un despliegue aprobado. La ruta se verificó en Vite local.
- La política de asociación de un control iniciado desde sector con una tarea programada conserva el comportamiento previo: esos controles no se vinculan automáticamente. No se cambian recurrencias ni se atribuye cumplimiento de una tarea por intuición.
