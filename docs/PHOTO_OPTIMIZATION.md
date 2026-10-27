# Optimización de fotografías — CER

Implementación del 27/10/2026. Las imágenes nuevas se procesan en la Edge Function `cer-evidence` antes de guardarlas en el bucket privado; PostgreSQL conserva únicamente los metadatos y la ruta.

## Flujo

1. El usuario inicia sesión y completa el registro existente.
2. El frontend envía cada foto al backend con el módulo, identificador de operación e identificador de foto.
3. El backend verifica la identidad con Supabase Auth y consulta su perfil activo y permisos por módulo.
4. Valida tamaño, firma binaria y decodificación real del archivo. Admite JPEG, PNG y WebP de hasta 5 MiB; limita el tamaño descomprimido a 20 megapíxeles y utiliza límites de memoria del motor.
5. Corrige la orientación antes de quitar EXIF y otros perfiles, incluida la información GPS cuando esté presente. Mantiene proporciones, reduce el lado largo a un máximo de 2048 píxeles y convierte a WebP con calidad 82. Usa filtro Triangle y el método rápido del codificador para respetar el presupuesto de cómputo del runtime. No amplía fotos pequeñas.
6. Guarda un objeto privado e inmutable. Su ruta incorpora el autor real, la operación, la versión del procesamiento y un SHA-256 del origen; un reintento reutiliza ese objeto.
7. La transacción del registro vincula la ruta y conserva la autoría del servidor. Si el procesamiento falla, el formulario permanece abierto.

La migración `20261027034907_evidence_optimization.sql` retira la política de inserción directa de usuarios. La función guarda mediante sus credenciales de servidor únicamente después de comprobar permisos. Las políticas existentes de lectura y protección del historial se conservan.

## Alcance

- Se procesan las nuevas cargas. No se transforman ni borran fotos históricas.
- El ahorro depende de la foto original; una imagen ya optimizada puede reducirse poco o incluso crecer al cambiar de codificación. No hay un porcentaje garantizado.
- La configuración prioriza evidencias legibles de mantenimiento, no imágenes de diagnóstico clínico.
- Si falla el registro después de cargar la foto, puede quedar un objeto privado sin vincular; se mantiene la limitación documentada sobre limpieza de huérfanos.
- El frontend publicado en Vercel necesita incluir el nuevo adaptador para usar este flujo. No se publica automáticamente desde la rama local.

## Dependencias y configuración

Motor oficial `@imagemagick/magick-wasm@0.0.45`, fijado tanto en el import map de Deno como en la dependencia local usada por pruebas. El JavaScript se incluye como dependencia de la función y el binario WASM se empaqueta explícitamente como archivo estático. No se incorpora al bundle del navegador ni se utiliza un servicio externo de conversión.

Para desplegar: ejecutar `npm ci`, `npm run prepare:images` y `npx supabase functions deploy cer-evidence --project-ref pnqsvmtmkceznoswpgfz` con Docker disponible. No usar `--use-api` en esta función: el empaquetado de archivos estáticos requiere Docker. El script verifica el SHA-256 de la versión fijada y copia el binario a una carpeta generada excluida de Git.

`verify_jwt=true` y comprobación adicional `auth.getUser` en la función. Las variables SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY son del runtime de Supabase; ninguna clave privilegiada se agrega a VITE_.

`CER_APP_ORIGINS` permite ajustar los orígenes CORS, separados por comas. Por defecto admite `http://127.0.0.1:5173`, `http://localhost:5173` y `https://proyecto-cer.vercel.app`. Para otro puerto o dominio de preview, configurar explícitamente su origen exacto. CORS no reemplaza Auth ni los permisos del módulo.

## Verificación

`npm run test:images`: pruebas con imágenes reales generadas por el motor, reducción, dimensiones/proporciones, orientación, eliminación de EXIF, rechazo de MIME falso y tamaño máximo. `npm run test:backend` comprueba también que un usuario operativo no pueda cargar directamente a Storage ni borrar una evidencia vinculada.

El procedimiento de respaldo incorpora la política nueva al archivo de restauración de Storage para no reabrir la subida directa al recuperar una copia.

### Prueba remota completada

Se ejecutó `node scripts/qa/evidence-live.mjs --run` contra Proyecto-CER con una cuenta técnica de Enfermería, limitada a Grupo electrógeno, y una imagen sintética JPEG con textura de 3200×2400 píxeles.

- Origen: 2.028.689 bytes. Resultado: WebP de 477.680 bytes, 2048×1536 píxeles. Ahorro del 76% en este caso sintético; no es una promesa para todas las fotos.
- Descarga mediante sesión autorizada, tamaño comprobado y sin perfil EXIF.
- Reintento devolvió la misma ruta con reused=true, sin crear otro objeto.
- Acceso a Loop rechazado con 403; contenido falso rechazado con 400; anónimo rechazado con 401.
- Subida directa al bucket rechazada por permisos.
- Cuenta, perfil y objeto técnico eliminados al terminar; no se usaron datos de la clínica ni se enviaron correos.

Antes de esta prueba hubo fallos de empaquetado y de recursos: se incluyó el binario WASM explícitamente mediante Docker y se cambió a codificación rápida. La imagen inicial de QA también excedía 5 MiB; se corrigió el fixture y se agregaron límites de tiempo y diagnóstico por etapa al script. No se ocultaron esos fallos como pruebas aprobadas.

La prueba cubre una imagen de aproximadamente 7,7 megapíxeles; no demuestra que cualquier imagen cercana al límite superior pueda procesarse dentro de los recursos de Supabase. Antes de operar con el centro, comprobar legibilidad con fotografías reales autorizadas de sus equipos y etiquetas.

El script remoto no forma parte de npm test: requiere `--run` explícito y credenciales administrativas locales ya autorizadas. Obtiene secretos solo en memoria y limpia únicamente sus propios datos técnicos. [Evidencia resumida](evidence/photo-optimization-remote.json).

Referencia técnica: [Supabase: procesamiento de imágenes en Edge Functions](https://supabase.com/docs/guides/functions/examples/image-manipulation).
