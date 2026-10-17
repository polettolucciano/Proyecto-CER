# Proyecto CER: requisitos y cuestiones pendientes

Fuente: `CER Aplicaciones.docx` facilitado por el cliente, seis páginas. Este resumen preserva lo que el cliente expresó y separa explícitamente recomendaciones.

## Confirmado por el documento del cliente
- Dos grupos: **Mantenimiento** y **Capacitaciones**. Capacitaciones: material, videos y presentaciones de acceso público.
- Mantenimiento: formularios para registrar tareas de equipos y sectores con distintas periodicidades/responsables y alimentar un tablero; unificar formularios que actualmente están en papel. Existe una implementación parcial en AppSheet.
- Acceso por navegador y celular, usuarios con permisos para módulos, exportación de registros en formato de planilla (XLS) para informes y posibilidad futura de avisos por correo o celular debido a vencimientos.
- Módulos nombrados: Grupo electrógeno; Ósmosis Diaria; Loop; Carro de paro; Fumigación; Mantenimientos eléctricos; Mantenimientos de salas.
- Grupo electrógeno: control mensual. Formulario impreso incluye modelo/número, controles de equipo parado y marcha en vacío: nivel de agua radiador, aceite, combustible, filtros de aire, batería, pérdidas, tablero y simulación de transferencia; horas de funcionamiento, voltaje, presión de aceite, frecuencia, tensión, otros, responsable/firma, fecha y observaciones. Algunas referencias aparecen en el formulario y deben validarse antes de programar alarmas.
- Ósmosis diaria: se documentan presiones, bombas y pérdidas, relación de rechazo, conductividad, temperatura, sal, dureza/cloro (semanal), cambio microfiltros (mensual), bacteriológico (mensual), fisicoquímico (semestral), responsable y observaciones. Bocetos de AppSheet muestran carga desde teléfono y foto.
- Loop: rotación quincenal de bombas en planta baja, pretratamiento y loop; datos de fechas, estados START/STOP y quién realizó. El texto también dice 'Diariamente' — **periodicidad exacta por actividad pendiente de confirmar**. Bocetos muestran fotos y observaciones.
- Tablero de mantenimiento preventivo muestra agrupación por categoría, responsable, frecuencia y meses. No se puede inferir automáticamente el significado de cada color o marca: confirmar antes de codificar estados.

## Recomendaciones técnicas, NO confirmadas por cliente
- Definir matriz de permisos por rol y módulo; aplicar RLS en Supabase y validación del lado servidor cuando corresponda.
- Guardar actor, fecha/hora y cambios relevantes de formularios de control para trazabilidad; acordar conservación, corrección y auditoría.
- Soportar estados de carga, guardado, error, duplicación y reconexión sin registros ambiguos.
- Diseñar exportaciones XLSX/CSV y validar formato exacto con CER, sin perder compatibilidad con XLS solicitado.
- Registrar catálogo de equipos, periodicidades, umbrales y formularios como datos configurables si la complejidad lo justifica.
- Incorporar comprobación de accesibilidad móvil y pruebas de permisos, filtros, tablas y exportaciones.
- Prever respaldo, restauración y monitoreo antes de usar en producción.

## Pendiente de acordar más adelante
1. Periodicidad específica de cada control en Loop; 'diario' vs 'quincenal'.
2. Perfiles existentes (administrador, supervisor, técnico, consulta) y operaciones permitidas para cada uno.
3. Significado de marcas/colores del tablero original y reglas de atrasos y avisos.
4. Unidades, límites, tratamiento de valores fuera de rango, fotos y firma/responsabilidad.
5. Cómo se identifica un equipo, si puede haber varios del mismo tipo y qué ocurre si se reemplaza.
6. Si se requiere funcionamiento sin conexión, y cómo evitar duplicaciones al sincronizar.
7. Estructura exacta y alcance de exportaciones y si el cliente necesita importación histórica desde AppSheet.
8. Requisitos sobre acceso público y carga/edición de contenido de Capacitaciones.
9. Política de respaldo, conservación, rectificación y acceso a históricos.
10. Si habrá datos personales o clínicos adicionales; el documento NO indica que haya historia clínica ni datos de pacientes.
