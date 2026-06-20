-- Migración: popup de novedades v1 (visto por usuario)
-- Fecha: 2026-06-19
--
-- Marca si el usuario ya vio el popup de novedades v1. El popup solo aparece
-- cuando esta columna es false (default tras aplicar la migración). El código es
-- resiliente: si la columna aún no existe, el popup simplemente no se muestra.
--
-- Para futuros anuncios: crear popup_novedades_v2_visto, etc. (mismo patrón) y
-- reusar el componente NovedadesPopup con esa columna.
--
-- Ejecutar en: Supabase → SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS popup_novedades_v1_visto BOOLEAN DEFAULT false;
