-- ============================================================================
-- Migración: Autopost v2.1 — 7 tipos de pieza + estado de rotación
-- Fecha: 2026-08-02
-- Encargo: encargo-code-implementar-7-tipos-autopost-2026-08-02.md + guía v2.1
--
-- Añade el tipo de pieza a autopost_posts y una tabla de estado de rotación por
-- cuenta (ciclo canónico de 8 semanas 2E+3A+2P+1D). La rotación es determinista:
-- semana_ciclo 1..8 mapea a un tipo fijo (ver src/lib/autopost/rotacion.ts).
--
-- NOTA (Cowork): aplicar en Supabase producción. Idempotente. BEGIN/COMMIT.
-- ============================================================================

begin;

-- Tipo de pieza generada (producto/novedad/arquetipoONG/…). TEXT libre para no
-- bloquear futuros tipos; los valores válidos los controla el código.
alter table autopost_posts add column if not exists tipo text;
comment on column autopost_posts.tipo is
  'Tipo de pieza v2.1: piezaProducto | piezaNovedad | piezaArquetipoONG | piezaArquetipoEmpresa | piezaArquetipoParticular | piezaDato | piezaEducativa';

-- Estado de rotación por cuenta (persiste el ciclo de 8 semanas entre deploys).
create table if not exists autopost_rotacion_estado (
  cuenta_id           uuid primary key references autopost_cuentas(id) on delete cascade,
  semana_ciclo        int not null default 1 check (semana_ciclo between 1 and 8),
  ultimo_tipo         text,
  ultima_subvariante  text,
  updated_at          timestamptz not null default now()
);

-- RLS activado sin políticas → solo service-role (crons/admin), como el resto de autopost.
alter table autopost_rotacion_estado enable row level security;

commit;
