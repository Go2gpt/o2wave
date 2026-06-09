# o2Wave — Estado del proyecto (handoff para Cowork)

> Documento de traspaso. Léelo entero antes de continuar. El detalle de Stripe
> está además en `docs/STRIPE.md`.

## 1. Qué es y dónde vive
- **o2Wave**: PWA Next.js 14 (App Router, `src/`, TypeScript, Tailwind) que genera
  contenido de redes sociales con IA para ONGs y PYMEs.
- **Repo**: github.com/Go2gpt/o2wave · rama **main**.
- **Producción**: https://www.o2wave.app (SIEMPRE con `www`; el dominio sin www
  hace 308 → nunca generar URLs sin www; usar `SITE_URL` de `src/lib/siteUrl.ts`).
- **Deploy**: Vercel **Pro** (funciones hasta 300 s). El deploy lo lanza **Sebas**.

## 2. Stack y servicios
- Supabase: auth SSR por cookies, Postgres, Storage. Cliente normal (RLS) y
  `createAdminClient()` (service role, salta RLS — solo servidor).
- Anthropic `claude-sonnet-4-6` (texto, guiones, preselección de categorías).
- Replicate `black-forest-labs/flux-1.1-pro` (imágenes). OJO: su `output` es un
  **string** (flux-dev devolvía array); el código ya normaliza ambos.
- Resend (emails; dominio `generacion-o2.org` verificado; from `o2Wave <noreply@generacion-o2.org>`).
- Stripe (suscripciones).
- `@react-pdf/renderer` (PDF del pack), `sharp` + `opentype.js` (composición de imagen).

## 3. Reglas de trabajo (IMPORTANTE)
- **No se puede ejecutar SQL ni tocar dashboards** desde el código: se entrega
  SQL/instrucciones y **Sebas** los aplica en Supabase/Vercel/Stripe.
- Tras cada cambio: `npm run build` debe pasar; luego commit + push. **No desplegar**.
- Permisos por `tipo_entidad` con **bypass total para admin** (`profiles.es_admin`). Sebas es admin.
- TypeScript estricto, sin `any`. URLs absolutas siempre vía `SITE_URL`.
- Marca: naranja `#f9b23b`, verde `#93bf30`, negro `#0F0F0F`, rojo `#ef4444`.
  Tipografía Montserrat. Slogan: "Comunicas tú, ayudas a muchos."

## 4. Funcionalidad terminada
- Auth + onboarding (análisis web → identidad editable), verificación de ONGs +
  panel admin (`/admin`, `/admin/verificaciones`) con emails Resend.
- Generación de texto (Claude) e imagen (FLUX 1.1-pro: imagen limpia + titular
  horneado por código). Editor `/result` (drag/resize titular, editar, regenerar,
  subir, compartir, descargar con horneado on-demand).
- Guion TikTok enriquecido (duración, tono, entorno por chips, planos, hashtags, audio).
- Calendario de Días Clave `/dias` (preselección IA de 10 categorías) + "Mis fechas"
  `/dias/mis-fechas` (CRUD).
- PWA (manifest, iconos, banner instalar con dismiss 7 días).
- Perfil editable `/perfil` (marca, categorías, config pack). Páginas legales.
  `BackLink` consistente (gris; prop `dark`; modo `router.back()`).

## 5. Pack PDF semanal — estado
Plan semanal de 5-7 días (una publicación/día). Prioridad de tema por día:
**fecha_usuario > día_clave (de sus categorías) > IA**. Reparto de redes 70/20/10.
Imágenes FLUX 1.1-pro, concurrencia 5, budget 180 s (maxDuration 300). Degradación:
"texto siempre + imagen donde dé tiempo".

**Hecho**: config en perfil; `packProcessor.ts` (genera y guarda imagen compuesta
+ limpia: `imagen_url` e `imagen_limpia_url` dentro del JSON `contenido`); botón
**"Generar pack ahora"** (`POST /api/pack/generar`, síncrono, anti-abuso) en el
dashboard; pantalla `/pack` (historial inline) con **editor por día**
(`/pack/[pack_id]/dia/[dia_index]`): editar/regenerar texto, **cambiar solo titular**,
**regenerar imagen**, **subir imagen propia**, **sustituir** y **eliminar día**;
**descarga PDF on-demand** (`/api/pack/[pack_id]/pdf`, Noto Sans + Twemoji);
**borrar pack** (lista y detalle, `DELETE /api/pack/[pack_id]`, limpia jobs + Storage).

**Pendiente**: Fase B (cron real semanal lunes 09:00 Madrid + `vercel.json`) y
Fase C (email aviso al generar el pack). Hoy la generación es **manual**.

## 6. Stripe — estado
**Hecho**: catálogo `src/lib/plans.ts`; `/plans` (toggle mensual/anual con "Ahorras XX€");
`/api/stripe/checkout` (Stripe Tax + promo codes); `/api/stripe/webhook` (refleja
plan en `profiles`); **Early Bird → Standard** vía Subscription Schedule (fase 1
`duration` 1 año / 12 meses → fase 2 Standard); **6 emails transaccionales** (Resend)
en el webhook (bienvenida/cancelación/fallo al usuario + alta/baja/fallo a
`suscripciones@generacion-o2.org`), con idempotencia.

Planes: ong_pequena (gratis), ong_mediana (9/90), earlybird (9, 12 meses → standard),
standard (19/190), pro (39/390). IVA incluido. 5 cupones.

**Pendiente**: Fase 4 (Customer Portal `/api/stripe/portal` + "Mi suscripción" en
`/perfil`; hay TODO en `emails.ts` enlazando a `/perfil` mientras tanto), Fase 5/6
(límites de uso + posts gratis + suspensión de acceso), Fase 8 (banner de pago fallido).

## 7. SQL — todo lo que debe existir en Supabase
> Las columnas nuevas de tablas existentes van como `ADD COLUMN IF NOT EXISTS`.
> Algunas tablas (`dias_clave`, `categorias_usuario`, `fechas_usuario`,
> `packs_semanales`, `pack_jobs`) se crearon a mano; aquí está el conjunto canónico.

```sql
-- profiles: calendario + pack + stripe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS categorias_preseleccionadas boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mostrar_dias_espana boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pack_semanal_activo boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pack_dias_semana int NOT NULL DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS redes_activas text[] NOT NULL DEFAULT '{instagram}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_actual text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_ciclo text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_estado text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_periodo_fin timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_gratis_usados int NOT NULL DEFAULT 0;
-- nota: el perfil también usa campos de identidad de marca (mision_valores,
-- publico_objetivo, servicios_programas, causas_o_productos, temas_prioritarios,
-- tipo_publicaciones, estilo_visual, geografia, idioma_principal,
-- hashtags_sugeridos, logros_numeros, info_extra, colores_marca, nif,
-- estado_verificacion, documento_url, es_admin). Ya creados.

-- generated_posts: guion estructurado de TikTok
ALTER TABLE public.generated_posts ADD COLUMN IF NOT EXISTS guion_tiktok jsonb;

-- Días clave (catálogo global, ~90 filas, solo lectura pública)
CREATE TABLE IF NOT EXISTS public.dias_clave (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes int NOT NULL, dia int NOT NULL,
  nombre text NOT NULL,
  categoria text NOT NULL,         -- 10 categorías (ver src/lib/categorias.ts)
  ambito text NOT NULL,            -- 'internacional' | 'espana'
  relevancia text NOT NULL,        -- 'alto' | 'normal'
  descripcion text
);
ALTER TABLE public.dias_clave ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dias_clave lectura" ON public.dias_clave FOR SELECT USING (auth.role() = 'authenticated');

-- Categorías de interés del usuario
CREATE TABLE IF NOT EXISTS public.categorias_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, categoria)
);
ALTER TABLE public.categorias_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat usuario" ON public.categorias_usuario FOR ALL USING (auth.uid() = user_id);

-- Fechas personalizadas del usuario
CREATE TABLE IF NOT EXISTS public.fechas_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  dia int NOT NULL CHECK (dia BETWEEN 1 AND 31),
  nombre text NOT NULL,
  descripcion text,
  recurrente boolean DEFAULT true,
  ano_especifico int,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.fechas_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fechas" ON public.fechas_usuario FOR ALL USING (auth.uid() = user_id);

-- Packs semanales generados (contenido = JSON con los días)
CREATE TABLE IF NOT EXISTS public.packs_semanales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  pdf_url text,
  contenido jsonb NOT NULL,        -- { dias: PackDia[] } (ver src/types/index.ts)
  email_enviado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.packs_semanales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own packs" ON public.packs_semanales FOR SELECT USING (auth.uid() = user_id);

-- Jobs de generación de pack (cron/manual)
CREATE TABLE IF NOT EXISTS public.pack_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  estado text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending','processing','done','failed')),
  error_msg text,
  pack_id uuid REFERENCES public.packs_semanales(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.pack_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own jobs" ON public.pack_jobs FOR SELECT USING (auth.uid() = user_id);

-- Bucket privado para PDFs (la subida la haría la Fase B/C con service role)
INSERT INTO storage.buckets (id, name, public) VALUES ('packs-pdf','packs-pdf',false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users read own pack PDFs" ON storage.objects FOR SELECT
  USING (bucket_id = 'packs-pdf' AND (storage.foldername(name))[1] = auth.uid()::text);
```
> El bucket público `post-images` ya existe (imágenes de posts y del pack —
> compuesta y limpia). Los escritos van con service role (saltan RLS).
> `imagen_limpia_url` y `prompt_imagen` viven dentro del JSON `contenido`, no son columnas.

## 8. Variables de entorno (Vercel)
- En uso: `ANTHROPIC_API_KEY`, `REPLICATE_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Pack/cron (Fase B): `CRON_TOKEN`.
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`, y `STRIPE_PRICE_{ONG_MEDIANA,EARLYBIRD,STANDARD,PRO}_{MENSUAL,ANUAL}` (8).
- Opcional: `NEXT_PUBLIC_SITE_URL` (default ya `https://www.o2wave.app`).

## 9. Lecciones aprendidas (no repetir errores)
- **Imagen/texto en Vercel**: `sharp({text})` (Pango/fontconfig) y `@font-face`
  base64 en SVG **fallan** en Lambda (fontconfig ausente → error / "tofu" □□□).
  Solución actual: `composeImage` rasteriza el titular como **paths vectoriales
  con opentype.js**, maquetando **glifo a glifo** (`charToGlyph` + `glyph.getPath`)
  porque `font.getPath()` crashea con una lookup GSUB (ccmp) de Montserrat. NO volver
  a usar `sharp({text})` ni `@font-face`.
- **opentype.js v2**: `loadSync()` está deprecado y devuelve undefined → usar
  `opentype.parse(readFileSync(...).buffer.slice(...))`.
- **Replicate flux-1.1-pro**: `output` es **string** (no array). No usa
  `num_inference_steps` ni `guidance`. Params: `aspect_ratio`, `output_format`,
  `output_quality`, `safety_tolerance`, `prompt_upsampling`.
- **PDF (@react-pdf/renderer)**: Helvetica no soporta emojis ni ₂. Se usa Noto Sans
  (`public/fonts/NotoSans-*.ttf`) + `Font.registerEmojiSource` con Twemoji (cdnjs).
- **Dominio**: todo lo absoluto con `www` (Stripe/Resend no siguen el 308).
- **Webhook Stripe**: idempotencia leyendo el estado previo de `profiles` antes de
  escribir (evita emails duplicados en reintentos).
- **Prompt de imagen del pack**: Claude devuelve `prompt_imagen` (descripción VISUAL,
  no eslogan); el FLUX prompt fuerza "sin texto/letras/logos".

## 10. Mapa de archivos clave
- Libs: `src/lib/{stripe,stripe-client,plans,emails,siteUrl,packProcessor,packAuth,composeImage,PackPdf,categorias,permissions,nif,resend,pollImage,preseleccionarCategorias,supabase,supabase-server,supabase-admin}.ts(x)`
- Pack UI: `src/app/(protected)/pack/{page,pack-list}.tsx`, `.../pack/[pack_id]/dia/[dia_index]/{page,dia-editor}.tsx`
- Pack API: `src/app/api/pack/{generar,regenerar-dia,actualizar-dia,actualizar-titular,subir-imagen,eliminar-dia,[pack_id],[pack_id]/pdf}/route.ts`, `src/app/api/cron/pack-procesar-usuario/route.ts`
- Stripe: `src/app/(protected)/plans/{page,plans-view}.tsx`, `src/app/api/stripe/{checkout,webhook}/route.ts`
- Días: `src/app/(protected)/dias/{page,dias-list}.tsx`, `.../dias/mis-fechas/{page,mis-fechas-list}.tsx`
- Dashboard: `src/app/(protected)/dashboard/{page.tsx,GenerarPackButton.tsx}`

## 11. Próximos pasos (elige uno)
1. **Stripe Fase 4** — Customer Portal + "Mi suscripción" en `/perfil`.
2. **Stripe Fase 5/6** — límites de uso, posts gratis, suspensión.
3. **Pack Fase B/C** — cron semanal + email aviso (la promesa "cada lunes").
4. **Stripe Fase 8** — banner de pago fallido.

## 12. Cómo trabajar
- Build: `npm run build` (si falla por PATH: `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"`).
- Commit con co-autor; push a `main`; NO desplegar (lo hace Sebas en Vercel).
