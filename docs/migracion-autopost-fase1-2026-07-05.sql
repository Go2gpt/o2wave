-- ============================================================================
-- Migración: Auto-publicación redes — Fase 1 (uso interno Generación o2)
-- Fecha: 2026-07-05
-- Encargo: encargo-autopost-fase1-interno-2026-07-05.md
--
-- Crea las tablas para conectar cuentas de Meta (FB Page + IG business) y
-- gestionar el ciclo de vida de los posts autogenerados.
--
-- Seguridad: RLS ACTIVADO SIN POLÍTICAS → ningún usuario (ni autenticado)
-- puede leer/escribir estas tablas por API pública. Solo el service-role
-- (crons y rutas admin server-side) las toca, porque bypassea RLS.
--
-- NOTA (Sebas): aplicar en Supabase → SQL Editor. Idempotente (IF NOT EXISTS).
-- ============================================================================

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Cuentas conectadas (una fila por Página de Facebook + su IG vinculado)
-- ---------------------------------------------------------------------------
create table if not exists autopost_cuentas (
  id                  uuid primary key default gen_random_uuid(),
  etiqueta            text not null,                    -- display: "o2wave.app", "go2.bcn"
  fb_page_id          text,                             -- id de la Página de FB
  fb_page_nombre      text,
  ig_user_id          text,                             -- id de la cuenta IG business vinculada (si hay)
  ig_username         text,
  token_cifrado       text not null,                    -- page access token (larga duración) cifrado AES-256-GCM
  token_expira_at     timestamptz,                      -- caducidad estimada (semáforo + renovación)
  perfil_publicacion  text not null default 'producto'
                        check (perfil_publicacion in ('producto', 'ong_general')),
  auto_approve        boolean not null default false,
  frecuencia_semanal  int not null default 1 check (frecuencia_semanal between 1 and 3),
  dias_horas          jsonb not null default '[]'::jsonb,   -- [{"dia":3,"hora":"10:00"}, ...] (dia: 1=lun..7=dom)
  activo              boolean not null default true,
  conectada_por       uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- 1b (ONG) endurecido: perfil ong_general NUNCA puede tener auto_approve.
  -- Se hardcodea a nivel de BBDD para que la UI no pueda activarlo (criterio 1b#9).
  constraint autopost_ong_sin_autoapprove
    check (perfil_publicacion <> 'ong_general' or auto_approve = false)
);

create unique index if not exists uq_autopost_cuentas_fb_page
  on autopost_cuentas(fb_page_id) where fb_page_id is not null;

-- ---------------------------------------------------------------------------
-- Posts autogenerados y su ciclo de vida
-- ---------------------------------------------------------------------------
create table if not exists autopost_posts (
  id                  uuid primary key default gen_random_uuid(),
  cuenta_id           uuid not null references autopost_cuentas(id) on delete cascade,
  estado              text not null default 'pending_review'
                        check (estado in ('pending_review','scheduled','publishing','published','failed','rejected','archived')),
  perfil_publicacion  text not null,
  texto               text not null,
  imagen_url          text,                             -- URL pública (Supabase storage)
  red                 text,                             -- 'facebook' | 'instagram' | 'ambas'
  publish_at          timestamptz,                      -- cuándo publicar (estado 'scheduled')
  aprobado_por        uuid references profiles(id),
  aprobado_at         timestamptz,
  intentos            int not null default 0,
  ultimo_error        text,
  fb_post_id          text,
  ig_post_id          text,
  fb_post_url         text,
  ig_post_url         text,
  publicado_at        timestamptz,
  semana_inicio       date,                             -- idempotencia por semana/cuenta
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_autopost_posts_estado
  on autopost_posts(estado, publish_at);
create index if not exists idx_autopost_posts_cuenta
  on autopost_posts(cuenta_id, created_at desc);

-- Evita duplicar el pack de una misma semana para la misma cuenta.
create unique index if not exists uq_autopost_posts_semana
  on autopost_posts(cuenta_id, semana_inicio) where semana_inicio is not null;

-- ---------------------------------------------------------------------------
-- RLS: activado sin políticas → acceso solo vía service-role (crons/admin).
-- ---------------------------------------------------------------------------
alter table autopost_cuentas enable row level security;
alter table autopost_posts   enable row level security;
