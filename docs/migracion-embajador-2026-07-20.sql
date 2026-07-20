-- ============================================================================
-- Migración: cuentas "embajador" (acceso pro sin cobro Stripe)
-- Fecha: 2026-07-20
-- Encargo: encargo-embajador-2026-07-20.md
--
-- Añade profiles.es_embajador. Cuando es true, el webhook de Stripe NO baja
-- plan_actual al cancelar/actualizar la suscripción (la cuenta conserva pro
-- sin pagar). Incluye backfill de los 4 embajadores actuales.
--
-- NOTA (Cowork): aplicar en Supabase producción. Idempotente. Envuelto en
-- BEGIN/COMMIT.
-- ============================================================================

begin;

alter table profiles
  add column if not exists es_embajador boolean not null default false;

comment on column profiles.es_embajador is
  'Si true, esta cuenta tiene acceso pro sin pagar. El webhook Stripe NO debe modificar plan_actual cuando es_embajador=true.';

-- Backfill de los 4 embajadores actuales (cancelados en Stripe el 20-jul-2026).
update profiles set es_embajador = true, plan_actual = 'pro'
where email in (
  'moragariart@gmail.com',
  'tina69bcn@gmail.com',
  'pol.alcantara.cadevall13@gmail.com',
  'amabakery.sl@gmail.com'
);

commit;

-- Verificación (opcional, ejecutar aparte tras el commit):
-- select email, es_embajador, plan_actual from profiles where es_embajador = true;
