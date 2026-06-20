-- Migración: identidad para imágenes IA coherentes
-- Fecha: 2026-06-19
--
-- Campo opcional. Solo se usa internamente para construir el prompt de imagen IA
-- cuando aparecen personas. No se comparte ni se exporta.
-- Valores: hombre | mujer | persona_trans | no_binario | equipo_mixto | prefiero_no_decir
--
-- Ejecutar en: Supabase → SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS genero TEXT;
