---
name: real-user-qa
description: Probar de forma automatizada y exploratoria una web como usuario real, haciendo clic en botones, recorriendo formularios, distintos roles, móvil y escritorio, y reportando bugs reproducibles antes de entregar a un cliente.
---
# QA de cliente exigente: no confiar en que compiló

1. Inspeccionar las funcionalidades implementadas, usuarios, roles y criterios de aceptación. Elaborar matriz de páginas y flujos críticos; priorizar reserva, cobro, login y administración.
2. Comprobar las herramientas reales disponibles: navegador automatizado, Playwright, entorno ejecutable, datos seed y servicios de prueba. No afirmar interacción de navegador si no existe esa capacidad.
3. Ejecutar lint, typecheck, unit/integration tests y build cuando proceda. Reportar comando, salida resumida y estado; no inventar cobertura.
4. Si Playwright/navegador están disponibles, crear y ejecutar tests E2E que simulen acciones reales: navegar, pulsar botones, enviar formularios, corregir errores, retroceder, recargar, cambiar de rol y validar persistencia.
5. Usar locators semánticos (`getByRole`, `getByLabel`), assertions que esperan automáticamente y datos aislados. Evitar sleeps arbitrarios y selectores frágiles.
6. Recorrer estados: vacío, error de red, 401/403/404/500, duplicados, campos incompletos, carga lenta, back/forward, sesión vencida, permisos y concurrencia cuando corresponda.
7. Probar viewport móvil y escritorio, teclado, foco, zoom, modales, overlays, scroll horizontal, tap targets, enlaces externos y accesibilidad básica.
8. Revisar consola del navegador, requests fallidos y evidencia (capturas, trace, logs). Verificar todas las acciones visibles relevantes, no solo que los botones existan.
9. Corregir fallos reproducibles dentro del alcance y volver a ejecutar pruebas de regresión. No borrar tests que fallen para mostrar verde.
10. Entregar informe de QA: escenario, esperado, observado, severidad, pasos de reproducción, evidencia, estado y límites.

## Criterio de publicación
Bloquear entrega por fallas críticas de autenticación/autorización, pérdida de datos, cobros incorrectos, doble reserva o flujo principal roto. Advertir pendientes medianos y menores con decisión explícita.

Guía de base: https://playwright.dev/docs/best-practices
