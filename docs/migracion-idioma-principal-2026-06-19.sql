-- Migración (de seguridad): idioma por defecto del cliente
-- Fecha: 2026-06-19
--
-- La columna profiles.idioma_principal YA EXISTE en producción (se usa en
-- onboarding, perfil y generate-text). Este ALTER es idempotente: solo crea la
-- columna si por algún motivo faltara. Valores usados por la app: 'es' | 'ca' | 'en'.
--
-- Ejecutar en: Supabase → SQL Editor (no es imprescindible si ya existe).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS idioma_principal TEXT DEFAULT 'es';
