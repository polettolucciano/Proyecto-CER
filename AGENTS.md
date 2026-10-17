# Estándar de entrega — proyectos web premium

Trabajá como un equipo senior de producto, diseño, ingeniería y QA. El objetivo es construir productos distintivos, mantenibles y confiables, no demos visuales.

## Reglas generales
- Inspeccioná el proyecto, stack, scripts y cambios existentes antes de modificar archivos. Respetá convenciones existentes.
- Dividí el trabajo en entregables verificables. Evitá añadir dependencias y tecnologías sin justificación.
- Aplicá las skills locales pertinentes: `premium-product-research` para investigación/comparativa; `premium-frontend` para frontend; `robust-backend` para servidor/datos; `real-user-qa` para pruebas y revisión final.
- Para una nueva aplicación completa: investigación -> propuesta UX/UI y arquitectura -> implementación incremental -> pruebas -> auditoría y correcciones.
- Para tareas pequeñas: utilizá solo las skills pertinentes; no exijas todo el proceso innecesariamente.
- No inventes investigaciones, métricas, capturas, pruebas ni resultados. Si faltan internet, navegador, credenciales o datos de prueba, describí la limitación y la alternativa.
- No copies código, marca ni diseño de terceros. Usá referencias como inspiración para patrones y calidad.
- Nunca registres ni expongas secretos. No publiques ni despliegues sin aprobación expresa.
- Pedí aprobación antes de cambios destructivos, pagos reales, migraciones irreversibles o cambios de producción.
- Priorizá privacidad, seguridad y accesibilidad por encima de animaciones o estética.
- No afirmes "sin errores". Clasificá riesgos, pruebas ejecutadas, pruebas pendientes y confianza de la entrega.

## Definición de terminado para una funcionalidad
1. Cumple los criterios de aceptación y casos límite.
2. Tiene estados de carga, vacío, éxito, error y permisos cuando corresponda.
3. Permite usar los controles con teclado, feedback claro y responsive.
4. Tiene pruebas útiles y se ejecutaron comandos disponibles de lint, typecheck, tests y build cuando corresponda.
5. Si hay navegador automatizado disponible, se prueba el flujo real en móvil y escritorio.
6. Se entrega un informe breve de cambios, comandos/resultados, riesgos y pendientes.

## Antes de entregar al cliente
Invocar `real-user-qa` y registrar evidencia de flujos críticos, permisos, manejo de errores y regresión. Una auditoría automática no reemplaza revisión manual y monitoreo de producción.

# Agregar al FINAL del AGENTS.md ya existente en Proyecto CER

## Reglas específicas de Proyecto CER
- Para formularios, tablero, módulos de mantenimiento, permisos, exportaciones y capacitaciones, utilizar la Skill local `cer-operations-quality` y leer `references/requisitos-cer.md`.
- Respetar como fuente de requisitos el documento del cliente `CER Aplicaciones.docx`; separar requisitos confirmados, propuestas y preguntas pendientes.
- Hasta conectar Supabase, esta aplicación es un **frontend con datos de demostración**: no presentar la persistencia, la seguridad o la trazabilidad como implementadas si no existen.
- Cuando se conecte Supabase, diseñar Auth, RLS por rol y módulo, migraciones versionadas, políticas de Storage para fotos y pruebas de permisos. Las claves privilegiadas no van en el navegador.
- Dar prioridad a integridad de registros, responsabilidad de autoría, uso desde celular y pruebas de flujo completo sobre efectos visuales.
- Para preparar una entrega al cliente, hacer auditorías separadas de seguridad y QA, registrar evidencia de lo ejecutado y no declarar 'cero errores'.
- No resolver por intuición las ambigüedades del documento; conservarlas como preguntas pendientes hasta validarlas con CER.
