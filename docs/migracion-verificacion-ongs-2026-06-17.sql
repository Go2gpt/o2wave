-- Migración: panel de verificación de ONGs (/admin/verificaciones ampliado)
-- Fecha: 2026-06-17
--
-- Añade a profiles los campos para: notas internas del admin, auditoría de la
-- revisión, y los datos DECLARADOS por la entidad (presupuesto y nº de
-- trabajadores remunerados). El CIF ya existe en la columna `nif`.
--
-- estado_verificacion es TEXT sin CHECK, así que admite el nuevo valor
-- 'necesita_info' (pedir aclaración) además de los actuales
-- pendiente / verificada / rechazada.
--
-- Ejecutar en: Supabase → SQL Editor. DEBE aplicarse antes (o a la vez) del
-- deploy: el panel de admin y las acciones aprobar/rechazar/aclarar leen y
-- escriben estas columnas.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_notes        text,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS verification_reviewed_by  uuid,
  ADD COLUMN IF NOT EXISTS presupuesto_anual         integer,
  ADD COLUMN IF NOT EXISTS trabajadores_remunerados  integer;
