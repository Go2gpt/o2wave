-- Migración: modo de imagen del post (Foto integrada con Gemini)
-- Fecha: 2026-06-18
--
-- Marca cómo se obtuvo la imagen del post:
--   'ia'        → generada por IA desde el prompt (default)
--   'propia'    → foto del usuario tal cual (sin IA, sin watermark)
--   'integrada' → foto del usuario integrada en escena IA (Gemini)
--
-- Útil para análisis. El badge de /result y el watermark NO dependen de esta
-- columna (se derivan del prefijo del path: propia-/integrada-), así que el
-- código funciona aunque la columna aún no exista (la escritura es best-effort).
--
-- Ejecutar en: Supabase → SQL Editor. (No la apliques desde el código.)

ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS modo_imagen TEXT NOT NULL DEFAULT 'ia';
