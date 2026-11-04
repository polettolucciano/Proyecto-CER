# Reorganización integral de CER — 04/11/2026

## Alcance y decisiones
El usuario pidió revisar toda la aplicación porque había información duplicada y funciones distribuidas entre demasiadas pantallas. Se conserva la identidad CER (Manrope, azul institucional, fondo claro), con menos destinos y contenido secundario. No se cambian las reglas de los procedimientos ni se eliminan registros.

### Estructura final
- **Inicio**: único catálogo de sectores/equipos. Nuevo control e historial en cada tarjeta. Administración agrega sectores desde el encabezado y consulta/edita la ficha desde la tarjeta.
- **Planificación**: pendientes, calendario y cronograma anual dentro de una misma sección. Los filtros de estado también muestran las cantidades; no hay otro resumen ni otra lista de avisos.
- **Historial**: controles realizados, resumen del resultado filtrado, períodos, versiones, observaciones, detalle, trazabilidad y exportación a Excel. Se elimina la consulta paralela de registros por período que existía en Informes.
- **Capacitaciones**: biblioteca y gestión de módulos/submódulos. La biblioteca pública continúa en `/capacitaciones` y no muestra navegación de mantenimiento.
- **Administración**: Personas y permisos / Preferencias del centro. Acceso de navegación visible para el administrador; se conservan las validaciones de edición existentes.

### Duplicaciones retiradas
- Inventario separado del inicio y resumen separado del centro.
- Avisos con otra lista de pendientes y botón flotante genérico de registro.
- Accesos rápidos de la búsqueda que volvían a listar las mismas pantallas.
- Historial y planificación dentro de la ficha del equipo: la ficha queda destinada a sus datos identificatorios.
- Consulta y exportación de registros en dos módulos diferentes.
- Paneles decorativos de roles, banners de biblioteca, estado de demostración repetido en el menú y paneles de funciones todavía no disponibles.

### Usabilidad
- Mismos cuatro destinos principales, mismo orden y mismos nombres en escritorio/celular y ambos perfiles.
- Enfermería puede elegir lista o calendario: no se le impone una grilla horizontal.
- Calendario móvil como agenda por día; permite abrir todos los eventos. En escritorio se conserva la grilla y se pueden desplegar los eventos adicionales de un día.
- Historial móvil con registros legibles sin desplazamiento horizontal, conservando los encabezados semánticos de la tabla.
- Buscador, filtros plegables, estados vacíos y foco de teclado; volver a la sección actual lleva al principio.
- El enlace “Ir al contenido” enfoca el contenido sin cambiar la ruta.
- Compatibilidad de enlaces: `#equipment` → Inicio; `#reports` → Planificación/Cronograma; `#summary` → Historial/últimos 30 días; `#users` → Administración/Personas.
- Las vistas de planificación y administración quedan en la URL y admiten recarga y navegación del navegador.

## Evidencia ejecutada
- `npm run test`: 10 archivos / 34 pruebas Vitest aprobadas y 44 pruebas Node aprobadas. Incluye nuevas pruebas de rutas: compatibilidad, conservación de equipo y módulo, codificación de identificadores y validación de vistas.
- `npm run build`: aprobado, incluye TypeScript. Continúa el aviso existente por JavaScript mayor a 500 kB (bundle principal y ExcelJS).
- `npm run typecheck`: aprobado durante la implementación.
- `git diff --check`: aprobado.
- Navegador integrado sobre servidor Vite local, modo demostración. No se instalaron dependencias ni un navegador adicional.
- Se comprobó la navegación de Administrador (cuatro secciones y Administración) y Enfermería (cuatro secciones, sin agregar/editar sectores).
- Ficha del sector → edición → cancelar; alta de integrante → cancelar; preferencias del centro accesibles desde su vista. No se modificaron cuentas durante el recorrido.
- Enfermería → Ósmosis → formulario correcto con equipo preseleccionado → cancelar sin registrar controles ficticios.
- Historial desde sector, cuatro controles del generador; apertura y detalle de un registro existente en celular.
- Filtro “Próximos” devuelve los dos controles correspondientes en la sesión de demostración.
- Calendario por URL `#planning?view=calendar`, recarga y agenda móvil con eventos del mes.
- Cuatro enlaces anteriores comprobados en navegador: redirigen a sus nuevas ubicaciones sin pantallas duplicadas.
- Descarga real del cronograma anual desde Planificación y lectura del XLSX con ExcelJS: hoja “Programa 2026”, 16 columnas, incluidos los doce meses.
- Descarga real del historial filtrado: hoja “Registros” con encabezados y cuatro filas, todas del Grupo electrógeno principal; hojas de Verificaciones y Trazabilidad presentes.
- Búsqueda sin coincidencias, limpieza y filtros accionados con Enter.
- Enlace “Ir al contenido” probado con teclado: conserva la URL y enfoca `main-content`.
- Anchos DOM de Inicio comprobados a 375, 768, 1280 y 1440 px, sin desborde horizontal. Inspección visual de inicio, historial y planificación en celular y escritorio.
- Se corrigió durante la revisión móvil una regla flex que ensanchaba el ícono de los registros. Se repitió la inspección visual después de corregirla.
- Hubo un aviso transitorio de Vite al reorganizar el archivo de resumen durante la edición. La importación definitiva compila; el módulo antiguo queda como reexportación de compatibilidad.

## Capturas
- `output/playwright/reorganizacion-2026-11-04/inicio-movil.png`
- `output/playwright/reorganizacion-2026-11-04/inicio-escritorio.png`
- `output/playwright/reorganizacion-2026-11-04/historial-movil.png`
- `output/playwright/reorganizacion-2026-11-04/planificacion-movil.png`

## Límites
- La revisión de interfaz usa datos de demostración; no valida persistencia compartida, Auth o RLS contra un proyecto real.
- Las pruebas automatizadas existentes de backend no sustituyen una auditoría de seguridad integral ni una validación de producción.
- No se modificaron esquema, funciones, credenciales, configuración de respaldos ni reglas de recurrencia. Los controles fuera de programación mantienen la política previa de vinculación.
- No se repitieron subida de fotos, caída de red o todos los formularios de procedimientos: sus componentes de carga y reglas se conservan.
- No se afirma ausencia total de errores ni se inventan resultados con usuarios reales.
