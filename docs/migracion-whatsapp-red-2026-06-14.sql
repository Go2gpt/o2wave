-- ============================================================================
-- WhatsApp como red social de generación
-- Fecha: 2026-06-14
-- Ejecutar en Supabase SQL editor.
--
-- generated_posts.red_social puede tener un CHECK que solo permita
-- Instagram/Facebook/TikTok. Hay que ampliarlo para aceptar 'WhatsApp'.
-- Si NO existe ningún CHECK (la columna es texto libre), este script no es
-- necesario, pero ejecutarlo no hace daño.
-- ============================================================================

-- 1) Ver el constraint actual (informativo):
--    SELECT conname, pg_get_constraintdef(oid)
--    FROM pg_constraint
--    WHERE conrelid = 'public.generated_posts'::regclass AND contype = 'c';

-- 2) Reemplazar el CHECK para incluir 'WhatsApp'. AJUSTA el nombre del constraint
--    si el tuyo difiere (búscalo con la consulta de arriba). Ejemplo habitual:
ALTER TABLE public.generated_posts DROP CONSTRAINT IF EXISTS generated_posts_red_social_check;
ALTER TABLE public.generated_posts
  ADD CONSTRAINT generated_posts_red_social_check
  CHECK (red_social IN ('Instagram', 'Facebook', 'TikTok', 'WhatsApp'));
