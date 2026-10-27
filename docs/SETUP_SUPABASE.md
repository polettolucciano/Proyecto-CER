# Conectar Supabase — primero en pruebas

Actualización 27/10/2026: Proyecto-CER (pnqsvmtmkceznoswpgfz) ya está creado, vinculado y con tres migraciones aplicadas. Las secciones 1–2 describen la preparación reproducible; no es necesario volver a crear ni resetear el proyecto. El siguiente paso de acceso operativo es configurar el primer administrador (sección 3). La función cer-evidence requiere el empaquetado documentado en PHOTO_OPTIMIZATION.

## 1. Crear el servicio

Ingresar a [Supabase Dashboard](https://supabase.com/dashboard), crear un proyecto **CER Desarrollo**, elegir una región apropiada para Argentina y guardar la contraseña de base de datos en un gestor privado. Esperar a que termine la creación.

Compartir con el desarrollador solamente el nombre o URL pública. No enviar contraseña, secret key, service_role ni cadena PostgreSQL por chat.

## 2. Preparar el esquema

Desde la carpeta del proyecto, con la CLI ya incluida:

```bash
npx supabase login
npx supabase link --project-ref REFERENCIA_DEL_PROYECTO_DE_PRUEBAS
npx supabase db push --dry-run
```

El login abre autorización en tu navegador. Ingresar contraseñas únicamente en el prompt privado de la CLI. Revisar que la referencia corresponda a CER Desarrollo y que el proyecto esté vacío. Tras revisar el dry-run y autorizar ese destino:

```bash
npx supabase db push
```

Se aplican las dos migraciones de supabase/migrations: estructura/funciones y bucket privado/políticas. No cargan la demo. No ejecutar reset ni aplicar esto sobre un servicio activo. Si ya existen tablas CER, detenerse y comparar el historial antes de continuar.

## 3. Auth y primer administrador

En Auth del proyecto de pruebas, deshabilitar registro público, establecer mínimo 12 caracteres y configurar las URLs exactas:
- Site URL para desarrollo: http://127.0.0.1:5173
- Redirect permitido: http://127.0.0.1:5173/auth/callback

Si el puerto cambia, actualizar también la configuración. Crear el primer usuario desde la administración de Auth con correo propio y contraseña segura, sin incluirla en archivos. Obtener su UUID. El SQL siguiente es una **plantilla de bootstrap**, se ejecuta una sola vez en el SQL Editor del proyecto de pruebas, reemplazando el correo:

```sql
insert into public.cer_profiles(id,name,email,role,modules,active)
select id,'Administración CER',email,'Administrador','{}'::text[],true
from auth.users
where lower(email)=lower('REEMPLAZAR_POR_TU_CORREO')
and not exists (
  select 1 from public.cer_profiles where role='Administrador' and active
);
```

Comprobar que insertó exactamente una fila. Si no, verificar Auth/correo; no ampliar el filtro. El bootstrap es una operación de infraestructura excepcional, no un flujo de la web.

## 4. Activar el cliente local

Crear .env.local a partir de .env.example (está ignorado por Git):

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://REFERENCIA.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=CLAVE_PUBLICA_PUBLISHABLE
```

Obtener URL y publishable key del proyecto. No usar secret/service_role. Reiniciar npm run dev e ingresar con la cuenta creada. La base estará vacía; cargar equipos/tareas de prueba y elegir explícitamente sus reglas de avance. Los ejemplos locales no se sincronizan.

## 5. Invitaciones

La Edge Function cer-invite valida la sesión y el rol administrativo antes de usar privilegios. Configurar APP_ORIGIN con el origen exacto del frontend de pruebas, sin slash final. SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY son variables del servicio de Edge Functions; no son variables VITE ni se copian al frontend.

Desplegar únicamente en el proyecto de pruebas ya revisado:

```bash
npx supabase functions deploy cer-invite --project-ref REFERENCIA_DEL_PROYECTO_DE_PRUEBAS --use-api
```

Conservar verificación JWT de la plataforma; además, la función verifica getUser y el perfil activo. Configurar SMTP y el remitente en Auth para entrega real de correos. Las opciones del archivo supabase/config.toml no sustituyen la configuración alojada del Dashboard.

En Personas y permisos → Agregar integrante: ingresar nombre/correo, rol y módulos. La persona recibe el enlace y configura su contraseña. Probar el enlace real en otro dispositivo antes de darlo por resuelto. El correo de una cuenta existente se administra en Auth; desactivar un perfil revoca operaciones aunque aún exista su sesión.

Si el correo fue enviado pero falló la creación de perfil, la respuesta lo informa y la cuenta no obtiene acceso operativo. No borrar ni reinvitar a ciegas: verificar su UUID en Auth y completar el perfil mediante soporte de infraestructura con una operación autorizada y auditada. Este caso requiere un procedimiento asistido; no existe recuperación automática de cuentas parciales desde la UI.

Recuperación de contraseña: Administración puede iniciar el correo de recuperación desde Auth, una vez configuradas las URLs/SMTP. El frontend contempla el evento de recuperación y el cambio de clave; el flujo completo de correo debe verificarse en el servicio real.

## 6. Validación antes de producción

Crear una cuenta de Enfermería con un solo módulo y otra sin acceso operativo. Verificar login/logout/recuperación, RLS mediante API directa, archivos privados, persistencia entre dos dispositivos, conflictos simultáneos, exportaciones y biblioteca anónima. Completar también backup y restauración aislada.

La base de producción debe ser otro destino revisado, con sus propias credenciales y autorización. No trasladar automáticamente la demo ni datos de prueba.

Referencias: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [seguridad de Edge Functions](https://supabase.com/docs/guides/functions/auth), [Storage](https://supabase.com/docs/guides/storage/security/access-control).
