# Proyecto CER: requisitos y cuestiones pendientes

Fuente: `CER Aplicaciones.docx` facilitado por el cliente, seis páginas. Este resumen preserva lo que el cliente expresó y separa explícitamente recomendaciones.

## Confirmado por el documento del cliente
- Dos grupos: **Mantenimiento** y **Capacitaciones**. Capacitaciones: material, videos y presentaciones de acceso público.
- Mantenimiento: formularios para registrar tareas de equipos y sectores con distintas periodicidades/responsables y alimentar un tablero; unificar formularios que actualmente están en papel. Existe una implementación parcial en AppSheet.
- Acceso por navegador y celular, usuarios con permisos para módulos, exportación de registros en formato de planilla (XLS) para informes y posibilidad futura de avisos por correo o celular debido a vencimientos.
- Módulos nombrados: Grupo electrógeno; Ósmosis Diaria; Loop; Carro de paro; Fumigación; Mantenimientos eléctricos; Mantenimientos de salas.
- Grupo electrógeno: control mensual. Formulario impreso incluye modelo/número, controles de equipo parado y marcha en vacío: nivel de agua radiador, aceite, combustible, filtros de aire, batería, pérdidas, tablero y simulación de transferencia; horas de funcionamiento, voltaje, presión de aceite, frecuencia, tensión, otros, responsable/firma, fecha y observaciones. Algunas referencias aparecen en el formulario y deben validarse antes de programar alarmas.
- Ósmosis diaria: se documentan presiones, bombas y pérdidas, relación de rechazo, conductividad, temperatura, sal, dureza/cloro (semanal), cambio microfiltros (mensual), bacteriológico (mensual), fisicoquímico (semestral), responsable y observaciones. La planilla operativa entregada el 20/10/2026 agrega Mixer en turnos mañana y tarde con litros de bicarbonato, densidad de referencia 1,037–1,057 y desinfección diaria indicada como 4 litros de hipoclorito en 400 litros de agua, test de cloro y responsable. Bocetos de AppSheet muestran carga desde teléfono y foto.
- Loop: la planilla operativa entregada el 20/10/2026 confirma desinfección quincenal de Loop y Mixer con controles de cloro/ácido peracético y rotación quincenal de bombas en planta baja, pretratamiento y loop; registra fechas, estados START/STOP y quién realizó. Bocetos muestran fotos y observaciones.
- Tablero de mantenimiento preventivo agrupa por categoría, responsable, frecuencia y meses. CER confirmó la convención: una X negra indica pendiente/no realizado todavía, una X verde indica realizado correctamente y una X roja indica no realizado o con falla.
- Los usuarios operativos que realizan los mantenimientos son integrantes de Enfermería. Administrador, supervisión y operaciones permitidas por cada perfil siguen pendientes de validación.
- CER requiere poder consultar el historial cuando sea necesario. Deben conservarse búsqueda, filtros, detalle y trazabilidad de rectificaciones/anulaciones; la política definitiva de conservación sigue pendiente.

## Recomendaciones técnicas, NO confirmadas por cliente
- Definir matriz de permisos por rol y módulo; aplicar RLS en Supabase y validación del lado servidor cuando corresponda.
- Guardar actor, fecha/hora y cambios relevantes de formularios de control para trazabilidad; acordar conservación, corrección y auditoría.
- Soportar estados de carga, guardado, error, duplicación y reconexión sin registros ambiguos.
- Diseñar exportaciones XLSX/CSV y validar formato exacto con CER, sin perder compatibilidad con XLS solicitado.
- Registrar catálogo de equipos, periodicidades, umbrales y formularios como datos configurables si la complejidad lo justifica.
- Incorporar comprobación de accesibilidad móvil y pruebas de permisos, filtros, tablas y exportaciones.
- Prever respaldo, restauración y monitoreo antes de usar en producción.

## Pendiente de acordar más adelante
1. Perfiles de administración/supervisión y operaciones permitidas para cada uno; Enfermería como usuario operativo ya fue confirmado.
2. Si una X negra se transforma automáticamente en roja al vencer y cuál es la regla exacta de atrasos y avisos.
3. Unidades, límites, tratamiento de valores fuera de rango, obligatoriedad de fotos y equivalencia entre firma e identidad autenticada.
4. Si los controles de Ósmosis y Mixer se registran en un único formulario diario o en registros separados por turno.
5. Si la desinfección y la rotación quincenal de Loop deben completarse siempre juntas o pueden registrarse por separado.
6. Cómo se identifica un equipo, si puede haber varios del mismo tipo y qué ocurre si se reemplaza.
7. Si se requiere funcionamiento sin conexión, y cómo evitar duplicaciones al sincronizar.
8. Estructura exacta y alcance de exportaciones y si el cliente necesita importación histórica desde AppSheet.
9. Requisitos sobre acceso público y carga/edición de contenido de Capacitaciones.
10. Política de respaldo, conservación, rectificación y acceso a históricos.
11. Si habrá datos personales o clínicos adicionales; el documento NO indica que haya historia clínica ni datos de pacientes.
