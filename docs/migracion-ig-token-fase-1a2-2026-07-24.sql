-- ============================================================================
-- Migración: Instagram Business Login (Fase 1a.2)
-- Fecha: 2026-07-24
-- Encargo: encargo-fase-1a2-instagram-business-login-2026-07-24.md
--
-- Instagram Business Login es un OAuth separado (api.instagram.com). El IG
-- token es distinto del Page Token de FB y caduca a ~60 días (con refresh).
-- Se guarda en su propia columna. ig_user_id / ig_username ya existían.
--
-- NOTA (Cowork): aplicar en Supabase producción. Idempotente. BEGIN/COMMIT.
-- ============================================================================

begin;

alter table autopost_cuentas add column if not exists ig_token_cifrado   text;
alter table autopost_cuentas add column if not exists ig_token_expira_at timestamptz;

comment on column autopost_cuentas.ig_token_cifrado is
  'IG access token (Instagram Business Login) cifrado AES-256-GCM. Long-lived ~60 días.';
comment on column autopost_cuentas.ig_token_expira_at is
  'Caducidad del IG token (~60 días). El cron C6 lo refresca antes de caducar.';

commit;
