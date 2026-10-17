---
name: premium-frontend
description: Diseñar e implementar frontend distintivo, visualmente memorable y de calidad profesional para aplicaciones web, landing pages, dashboards y rediseños, sin interfaces genéricas.
---
# Frontend premium: diseño con criterio de estudio profesional

1. Leer el contexto, la marca y el resultado de `premium-product-research` si existe. Reconocer componentes y patrones previos.
2. Elegir UNA dirección artística explícita: identidad, tono, tipografía, sistema de color, grilla, escala espacial, imágenes y detalles característicos. Explicar por qué encaja con el cliente; no usar por defecto gradientes morados, cards idénticas o animaciones gratuitas.
3. Proponer la experiencia central con mapa de pantallas y principales tareas. Diseñar primero el recorrido móvil y escritorio; especificar estados loading/empty/error/success/disabled.
4. Construir un sistema de diseño pequeño (tokens, tipografía, espaciado, radios, interacción) y componentes reutilizables. Usar el stack real del repositorio; no reescribir tecnologías porque sí.
5. Emplear semántica HTML, etiquetas, foco visible, teclado, contraste, mensajes claros, targets táctiles cómodos, reduced motion y animaciones que no afecten rendimiento.
6. Cuidar contenido realista, microcopy específico, consistencia visual, imágenes optimizadas y detalle fino. Verificar layout entre ~375px, 768px, 1280px y 1440px si se dispone de navegador.
7. Revisar performance: evitar cascadas de requests, bundles innecesarios, layout shift e imágenes pesadas. Si es React/Next, aplicar buenas prácticas compatibles con las de Vercel.
8. Examinar pantallas con capturas reales si existen herramientas visuales: corregir alineaciones, cortes, scroll horizontal, interacciones y estados, no solo inspeccionar código.
9. Al finalizar: listar componentes, decisiones diferenciales, pruebas hechas y defectos abiertos. Jamás declarar evaluación visual si no hubo navegador/capturas.

## Guías externas recomendadas, no incluidas ni copiadas
- Anthropic: https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design (revisar licencia y compatibilidad antes de incorporar)
- Vercel Web Interface Guidelines: https://github.com/vercel-labs/web-interface-guidelines
- Vercel agent-skills: https://github.com/vercel-labs/agent-skills (web-design-guidelines, react-best-practices)

Las guías de terceros se usan solo si están instaladas o accesibles. No fingir haberlas leído si no se pudo.
