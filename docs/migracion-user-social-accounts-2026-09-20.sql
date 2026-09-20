-- ============================================================================
-- Migración: cuentas sociales por USUARIO (publicación server-side elegible)
-- Fecha: 2026-09-20
-- Encargo: que el usuario conecte sus cuentas (FB Página + IG Business) y elija
--          en cuál publicar; la publicación se hace server-side (Graph API), sin
--          depender de qué cuenta tenga activa en el móvil. Reutiliza el motor
--          de publicación del autopost (src/lib/meta/publish.ts → publicarPieza),
--          que consume token_cifrado + fb_page_id + ig_user_id.
--
-- Espeja los campos PUBLICABLES de autopost_cuentas, pero por usuario. El token
-- se guarda cifrado AES-256-GCM (mismo helper que el autopost). insert/update/
-- delete se hacen SIEMPRE server-side (OAuth callback / API con service role);
-- el cliente solo LEE sus propias filas (columnas de display, nunca el token).
--
-- NOTA (alcance): esto habilita el mecanismo para cuentas business conectables.
-- Abrirlo al público general requiere además Meta App Review (permisos
-- instagram_business_content_publish / pages_manage_posts). El mecanismo no
-- depende de la migración; la migración solo crea el almacén.
--
-- Idempotente. Envuelto en BEGIN/COMMIT. Ejecutar en Supabase → SQL Editor.
-- ============================================================================

begin;

create table if not exists public.user_social_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  etiqueta          text not null,            -- display: "@micuenta" o nombre de la Página
  red               text not null default 'meta'
                      check (red in ('meta')), -- de momento Meta (FB Página + IG business vinculada)
  fb_page_id        text,
  fb_page_nombre    text,
  ig_user_id        text,                      -- id de la cuenta IG Business vinculada (si hay)
  ig_username       text,
  token_cifrado     text not null,             -- page access token (larga duración) cifrado AES-256-GCM
  token_expira_at   timestamptz,
  es_predeterminada boolean not null default false,
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.user_social_accounts is
  'Cuentas sociales conectadas por cada usuario para publicar server-side (Graph API). token_cifrado = page access token AES-256-GCM. Gestión server-side (OAuth callback / API service role); el cliente solo lee columnas de display de sus propias filas.';

-- Un usuario no conecta la misma Página dos veces.
create unique index if not exists uq_user_social_fb_page
  on public.user_social_accounts(user_id, fb_page_id) where fb_page_id is not null;

-- Listado por usuario.
create index if not exists idx_user_social_user
  on public.user_social_accounts(user_id);

-- A lo sumo UNA predeterminada por usuario (índice parcial).
create unique index if not exists uq_user_social_default
  on public.user_social_accounts(user_id) where es_predeterminada;

alter table public.user_social_accounts enable row level security;

-- El usuario solo puede LEER sus propias cuentas (la UI consulta columnas de
-- display, nunca el token). Insert/update/delete van server-side (service role).
drop policy if exists "user_social_own_select" on public.user_social_accounts;
create policy "user_social_own_select"
  on public.user_social_accounts for select using (auth.uid() = user_id);

commit;

-- Verificación (opcional):
-- select count(*) from public.user_social_accounts;
