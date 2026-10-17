---
name: cer-operations-quality
description: "Aplica y comprueba los requisitos del Centro de Enfermedades Renales (CER) sobre registros de mantenimiento, grupos electrógenos, ósmosis diaria, loop, roles, tablero, exportaciones y capacitación. Utilizar al analizar, diseñar, implementar o probar funcionalidades del Proyecto CER. No utilizar en otros proyectos."
---

# CER — Ingeniería de producto y control de calidad

## Contexto y alcance
Trabajás en **Proyecto CER**, sistema web para centralizar formularios de mantenimiento y, como segundo grupo de aplicaciones, materiales públicos de capacitaciones. Leé `references/requisitos-cer.md` antes de modificar pantallas, validaciones, base de datos o lógica asociada. El documento del cliente `CER Aplicaciones.docx` es la fuente primaria; este archivo es una síntesis de trabajo, no lo reemplaza.

## Reglas de ejecución
1. Inspeccioná el stack y código ya existente antes de cambiarlo. Conservá las funcionalidades actuales y verificá los cambios con Git, TypeScript y scripts del proyecto cuando estén disponibles.
2. Separá **requisitos confirmados**, **propuestas técnicas** y **preguntas pendientes**. Nunca conviertas una propuesta en un requerimiento aprobado por el cliente.
3. Si actualmente solo existe frontend, conservá mocks etiquetados como **datos de demostración**; no afirmes que los controles están guardados ni protegidos por un backend que todavía no existe.
4. En formularios, priorizá uso desde celular, etiquetas y unidades claras, valores accesibles, errores comprensibles, recuperación de datos al fallar guardado y confirmación de éxito solo después de una persistencia real.
5. Las mediciones fuera de rango se deben mostrar sin alterar el valor registrado. Antes de aplicar bloqueos, alarmas o umbrales automáticos, confirmá sus unidades, referencias y acciones esperadas con CER.
6. Prepará el diseño de roles/permisos por módulo, pero cuando se conecte Supabase implementá su cumplimiento real en backend y RLS; ocultar botones no constituye autorización.
7. Para datos operativos importantes proponé registro de autor, fecha/hora, historial y trazabilidad de cambios; someté el alcance y política de retención a confirmación del cliente. Evitá permitir que una edición borre un registro previo sin aviso o auditoría.
8. Separá material público de capacitaciones de registros privados de mantenimiento. No asumas que se almacenarán datos clínicos ni pacientes; si el alcance se amplía, reevaluá requisitos legales, privacidad y seguridad.
9. Cuando corresponda, combiná Skills `robust-backend`, `real-user-qa`, `supabase`, `supabase-postgres-best-practices`, `security-best-practices` y `playwright`; activá solo las pertinentes y según disponibilidad.
10. Nunca ejecutes migraciones destructivas, conexiones a producción ni importaciones de datos reales sin autorización.

## Flujo para cada módulo
1. Leer los campos y periodicidad documentados; registrar lo pendiente sin adivinar.
2. Preparar criterios verificables de aceptación y estados vacío/cargando/error/éxito.
3. Desarrollar el frontend respetando nombres y proceso del documento; diseñar los puntos futuros de conexión a Supabase.
4. Al incorporar Supabase: esquema y migraciones versionadas; Auth, RLS, validación de entradas, políticas de Storage y pruebas con perfiles autorizado/no autorizado. Mantener claves privilegiadas fuera del navegador.
5. Probar en escritorio y celular con recorridos reales; cuando existan pruebas automatizadas, ejecutarlas. No afirmar que se ejecutaron si faltan herramientas.
6. Informar archivos modificados, pruebas, límites, riesgos, dudas que requieren respuesta de CER y siguientes pasos.

## Pruebas mínimas sugeridas
- Acceso por usuario y permisos de módulos. Probar también llamadas directas sin permiso cuando exista backend.
- Grupo electrógeno: todos los apartados documentados, mediciones numéricas, responsable, fecha y observaciones.
- Ósmosis diaria: controles, mediciones, periodicidades distintas, carga de observaciones y foto cuando corresponda.
- Loop: selección de bombas/estado, fechas, observaciones y fotos; no inventar una única periodicidad hasta aclarar la contradicción del documento.
- Tablero: pendientes, completados y vencidos calculados con reglas acordadas; no inventar resultados de mantenimiento.
- Exportación: verificar cantidad de filas, encabezados y permisos; comprobar que exporte lo filtrado según comportamiento acordado.
- Formularios: campo faltante, dato inválido, doble clic, error de red, salida accidental, sesiones vencidas, móvil y teclado.
- Seguridad y continuidad: pruebas de RLS, acceso horizontal, integridad de datos, restauración y copias de seguridad una vez exista backend.

## Bloqueo de entrega
Si no hay Supabase, pruebas de autorización reales o almacenamiento fiable, presentar el producto como **prototipo de frontend**, no como sistema listo para producción. La apariencia premium nunca justifica simular persistencia real.
