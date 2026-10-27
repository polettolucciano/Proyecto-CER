import { createClient } from '@supabase/supabase-js';
import { initializeImageEngine, optimizeImage, MAX_INPUT_BYTES, TRANSFORM_VERSION } from '../_shared/imageOptimization.ts';

let engine: Promise<void> | undefined;
function loadEngine() {
  if (!engine) engine = (async () => {
    try {
      const wasm = await Deno.readFile(new URL('./wasm/magick.wasm',import.meta.url));
      await initializeImageEngine(wasm);
    } catch {
      engine = undefined;
      throw new Error('IMAGE_ENGINE_UNAVAILABLE');
    }
  })();
  return engine;
}
const origins = new Set((Deno.env.get('CER_APP_ORIGINS') ?? 'http://127.0.0.1:5173,http://localhost:5173,https://proyecto-cer.vercel.app').split(',').map(s => s.trim()));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const modules = new Set(['generator','osmosis','loop','crash','fumigation','electrical','rooms','general']);

async function boundedForm(request: Request) {
  const limit = MAX_INPUT_BYTES + 32768;
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) throw new Error('INVALID_FORM');
  if (Number(request.headers.get('content-length')) > limit) throw new Error('INVALID_IMAGE_SIZE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_FORM');
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) { await reader.cancel(); throw new Error('INVALID_IMAGE_SIZE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return new Response(data, {headers:{'Content-Type':request.headers.get('content-type')!}}).formData();
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  const headers: Record<string,string> = {
    'Content-Type':'application/json',
    'Cache-Control':'no-store',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Vary':'Origin',
  };
  if (origin && origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const respond = (status:number, data:Record<string,unknown>) => new Response(JSON.stringify(data),{status,headers});
  if (origin && !origins.has(origin)) return respond(403,{message:'Origen no autorizado.'});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return respond(405,{message:'Método no permitido.'});
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{
      global:{headers:{Authorization:request.headers.get('authorization') ?? ''}},
      auth:{persistSession:false,autoRefreshToken:false},
    });
    const {data:identity,error:authError} = await caller.auth.getUser();
    if (authError || !identity.user) return respond(401,{message:'Iniciá sesión para cargar fotografías.'});
    const {data:profile,error:profileError} = await caller.from('cer_profiles').select('role,active,modules').eq('id',identity.user.id).single();
    if (profileError || !profile?.active) return respond(403,{message:'Tu perfil no está habilitado.'});

    const form = await boundedForm(request);
    const module = form.get('module'), operationId = form.get('operationId'), photoId = form.get('photoId'), file = form.get('file');
    if (typeof module !== 'string' || !modules.has(module) ||
        typeof operationId !== 'string' || !uuid.test(operationId) ||
        typeof photoId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(photoId) || !(file instanceof File)) return respond(400,{message:'Revisá los datos de la fotografía.'});
    if (profile.role !== 'Administrador' && !profile.modules.includes(module)) return respond(403,{message:'No tenés acceso a ese módulo.'});
    if (!file.size || file.size > MAX_INPUT_BYTES || !['image/jpeg','image/png','image/webp'].includes(file.type)) return respond(400,{message:'Usá JPG, PNG o WebP de hasta 5 MB.'});

    await loadEngine();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b => b.toString(16).padStart(2,'0')).join('');
    const path = module + '/' + identity.user.id + '/' + operationId + '/' + photoId + '-' + TRANSFORM_VERSION + '-' + digest + '.webp';
    const admin = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const storage = admin.storage.from('cer-evidence');
    const existing = await storage.info(path);
    if (!existing.error) return respond(200,{path,mime:'image/webp',storedBytes:existing.data.size,reused:true});

    const result = optimizeImage(bytes,file.type);
    const {error} = await storage.upload(path,result.bytes,{
      contentType:'image/webp',upsert:false,cacheControl:'31536000',
      metadata:{sourceSha256:digest,originalBytes:result.originalBytes,storedBytes:result.storedBytes,width:result.width,height:result.height,transformVersion:TRANSFORM_VERSION},
    });
    if (error) {
      // Otro reintento concurrente puede haber guardado exactamente el mismo objeto inmutable.
      const confirmed = await storage.info(path);
      if (confirmed.error) return respond(502,{message:'No se pudo guardar la foto optimizada. Conservá el formulario y volvé a intentar.'});
    }
    return respond(200,{path,mime:'image/webp',originalBytes:result.originalBytes,storedBytes:result.storedBytes,width:result.width,height:result.height});
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'IMAGE_ENGINE_UNAVAILABLE') return respond(503,{code,message:'El procesador de fotografías no está disponible. Conservá el formulario y volvé a intentar.'});
    if (/^(INVALID_|IMAGE_)/.test(code)) return respond(400,{message:code === 'IMAGE_DIMENSIONS_TOO_LARGE' ? 'La imagen es demasiado grande. Exportala con menor resolución (máximo 20 megapíxeles).' : 'La foto no tiene un formato válido o excede el límite permitido.'});
    console.error('cer-evidence: falló el procesamiento o almacenamiento de una fotografía.');
    return respond(422,{message:'No se pudo procesar la imagen. Probá otra foto JPG, PNG o WebP.'});
  }
});
