-- Migración: feature Pro "Foto integrada" (V6)
-- Fecha: 2026-06-16
--
-- Añade la columna que marca los posts cuya imagen se generó integrando una
-- foto del usuario (OpenAI images.edit). Es OPCIONAL para el funcionamiento
-- normal: la creación de posts sin foto NO usa esta columna. Sin embargo, una
-- generación CON foto (plan Pro) intentará escribir foto_integrada=true, así
-- que ejecuta esto en Supabase ANTES de probar la feature en producción.
--
-- Ejecutar en: Supabase → SQL Editor.

ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS foto_integrada BOOLEAN NOT NULL DEFAULT false;
