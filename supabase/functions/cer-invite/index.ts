import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
const origin=Deno.env.get('APP_ORIGIN')??'';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
Deno.serve(async(request:Request)=>{
 if(request.method==='OPTIONS')return new Response(null,{headers});
 const response=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers});
 if(request.method!=='POST' || !origin || (request.headers.get('origin') && request.headers.get('origin')!==origin))return response(403,'Acceso no permitido.');
 try{
  const url=Deno.env.get('SUPABASE_URL')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:request.headers.get('Authorization')??''}},auth:{persistSession:false}});
  const {data:identity,error:authError}=await caller.auth.getUser();if(authError || !identity.user)return response(401,'Iniciá sesión.');
  const {data:profile}=await caller.from('cer_profiles').select('role,active').eq('id',identity.user.id).single();
  if(!profile?.active || profile.role!=='Administrador')return response(403,'Solo Administración puede invitar integrantes.');
  const body=await request.text();if(body.length>20000)return response(400,'Solicitud demasiado grande.');
  const input=JSON.parse(body);
  const modules=['generator','osmosis','loop','crash','fumigation','electrical','rooms','general'];
  if(!input || typeof input.name!=='string' || input.name.trim().length<2 || input.name.trim().length>150 || typeof input.email!=='string' || input.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || !['Administrador','Enfermería'].includes(input.role) || !Array.isArray(input.modules) || input.modules.length>8 || input.modules.some((m:unknown)=>typeof m!=='string' || !modules.includes(m)) || (input.role!=='Administrador' && !input.modules.length))return response(400,'Revisá los datos.');
  const admin=createClient(url,secret,{auth:{persistSession:false}});
  const {data:invited,error}=await admin.auth.admin.inviteUserByEmail(input.email.trim().toLowerCase(),{redirectTo:`${origin}/auth/callback`,data:{must_change_password:true}});
  if(error || !invited.user)return response(409,'No se pudo invitar ese correo. Revisá si ya tiene una cuenta.');
  const operationId=crypto.randomUUID();
  // Reintentar solo un conflicto conocido; la invitación no se repite.
  for(let attempt=0;attempt<2;attempt++){
   const {data:settings,error:readError}=await caller.from('cer_settings').select('revision').single();
   if(readError)break;
   const {error:saveError}=await caller.rpc('cer_apply_changes',{p_operation_id:operationId,p_expected_revision:settings?.revision,p_commands:[{kind:'profile',data:{id:invited.user.id,name:input.name.trim(),role:input.role,modules:input.modules,active:true}}]});
   if(!saveError)return response(200,'Invitación enviada y perfil creado.');
   if(saveError.code!=='40001')break;
  }
  return response(409,'La cuenta fue invitada pero su perfil requiere completar la configuración desde Supabase. No tiene acceso operativo todavía. Consultá la guía SETUP_SUPABASE.');
 }catch{return response(500,'No se pudo completar la invitación.');}
});
