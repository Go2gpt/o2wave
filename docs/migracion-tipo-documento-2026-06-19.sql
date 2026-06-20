-- Migración: tipo de documento de identificación en el registro
-- Fecha: 2026-06-19
--
-- Guarda qué tipo de documento aportó el usuario al registrarse: CIF, DNI, NIE
-- o PASAPORTE (análisis posterior). El registro NO depende de esta columna para
-- funcionar: si aún no existe, el alta sigue (la escritura es best-effort y el
-- callback la persiste cuando la columna está disponible).
--
-- Ejecutar en: Supabase → SQL Editor. (No la apliques desde el código.)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT;  -- 'CIF' | 'DNI' | 'NIE' | 'PASAPORTE'
