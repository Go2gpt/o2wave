-- ============================================================================
-- Migración: nueva estructura de pricing de 3 planes (Free / Pro 4,90€ / Pro Nonprofit 1,99€)
-- Fecha: 2026-09-03
-- Encargo: reestructuración de pricing o2Wave aprobada por Sebas (2026-09-03)
--
-- Contexto:
--  - Se sustituyen los 5 planes antiguos (ong_pequena/ong_mediana/earlybird/
--    standard/pro 9/9/19/39€) por 3: FREE (gratis), PRO (4,90€) y PRO NONPROFIT
--    (1,99€, mismo producto que Pro, solo ONGs con CIF verificado).
--  - NO hay usuarios de pago (confirmado por Sebas). Las 4 cuentas embajador
--    siguen en plan_actual='pro' con es_embajador=true → conservan acceso full
--    sin pagar (el nuevo id "pro" incluye todas las features).
--  - El id de plan "pro" se REUTILIZA con el nuevo significado (4,90€ full).
--  - CIF/verificación de ONGs YA existe (columnas nif, estado_verificacion,
--    verification_*). Esta migración NO las toca.
--
-- Qué añade:
--  1. profiles.legacy_free_pre_2026_09  → traza de usuarios gratuitos previos al
--     relanzamiento (grandfathering: no se les toca nada).
--  2. tabla beta_invitaciones           → registro de los 100 slots del programa
--     Beta (Pro gratis 6 meses). La suscripción real y el descuento viven en
--     Stripe (cupón 100% 6 meses + promotion codes); esta tabla es el registro
--     de a quién se asignó cada código y su estado.
--
-- Idempotente. Envuelto en BEGIN/COMMIT.
-- Ejecutar en: Supabase → SQL Editor. Aplicar ANTES (o a la vez) del deploy del
-- código de los 3 planes.
-- ============================================================================

begin;

-- 1. Flag de grandfathering ---------------------------------------------------
alter table public.profiles
  add column if not exists legacy_free_pre_2026_09 boolean not null default false;

comment on column public.profiles.legacy_free_pre_2026_09 is
  'true = cuenta gratuita existente antes del relanzamiento de pricing (2026-09-03). Solo trazabilidad; no se les fuerza transición.';

-- Backfill: marca como legacy a los usuarios gratuitos actuales (no de pago, no
-- embajador). Los embajadores (plan_actual=pro sin cobro) NO se marcan.
update public.profiles
  set legacy_free_pre_2026_09 = true
  where coalesce(es_embajador, false) = false
    and (plan_actual is null or plan_actual in ('ong_pequena', 'free'));

-- 2. Registro del programa Beta (100 invitaciones) ----------------------------
create table if not exists public.beta_invitaciones (
  id                     uuid primary key default gen_random_uuid(),
  codigo                 text not null unique,          -- código único (coincide con el promotion code de Stripe)
  email                  text,                          -- a quién se invita (opcional hasta asignar)
  user_id                uuid references public.profiles(id) on delete set null,
  stripe_promotion_code  text,                          -- id del promotion_code en Stripe (promo_...)
  estado                 text not null default 'pendiente'
                           check (estado in ('pendiente', 'enviada', 'canjeada', 'expirada', 'anulada')),
  notas                  text,
  created_at             timestamptz not null default now(),
  canjeada_at            timestamptz,
  expira_at              timestamptz                    -- informativo (la expiración real la aplica el cupón de Stripe)
);

comment on table public.beta_invitaciones is
  'Programa Beta o2Wave: 100 slots de Pro gratis 6 meses. El descuento y su expiración los aplica Stripe (cupón repeating 6 meses + promotion codes); esta tabla registra asignación y estado.';

alter table public.beta_invitaciones enable row level security;

-- Solo servidor/admin gestiona invitaciones. Sin políticas de usuario final:
-- el acceso se hace con service role desde el backend/panel admin.

commit;

-- Verificación (opcional, ejecutar aparte tras el commit):
-- select count(*) filter (where legacy_free_pre_2026_09) as legacy_free,
--        count(*)                                        as total
-- from public.profiles;
-- select estado, count(*) from public.beta_invitaciones group by estado;
