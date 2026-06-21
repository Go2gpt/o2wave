-- Migración: añadir tipo de cuenta 'particular' (v2.3-rc1)
-- Fecha: 2026-06-21
--
-- OBLIGATORIA y BLOQUEANTE: profiles.tipo_entidad tiene un CHECK que hoy solo
-- permite ong_pequena/ong_mediana/empresa. El trigger handle_new_user inserta
-- tipo_entidad en el alta, así que SIN esta migración el registro de un
-- Particular FALLA (viola el CHECK). Aplícala ANTES de desplegar el código.
--
-- Ejecutar en: Supabase → SQL Editor.
-- Nota: el constraint suele autollamarse profiles_tipo_entidad_check. Si tu
-- instancia usa otro nombre, ajústalo en el DROP (verás el nombre con:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND contype = 'c';)

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tipo_entidad_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tipo_entidad_check
  CHECK (tipo_entidad IN ('ong_pequena', 'ong_mediana', 'empresa', 'particular'));
