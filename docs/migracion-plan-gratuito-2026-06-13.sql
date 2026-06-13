-- ============================================================================
-- Plan gratuito ONG pequeña: evidencia de aceptación de condiciones
-- Fecha: 2026-06-13
-- Ejecutar en Supabase (SQL editor).
-- ============================================================================

-- 1) Columnas nuevas en profiles (idempotente).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acepto_condiciones_plan_gratuito boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_aceptacion_plan_gratuito timestamptz;

-- 2) (Opcional pero recomendado) Que el trigger handle_new_user copie la
--    aceptación desde la metadata del signUp al crear el perfil, para el flujo
--    con confirmación de email (donde el perfil nace en el trigger, no en el
--    upsert del cliente).
--
--    AJUSTA este cuerpo a tu handle_new_user actual: añade las dos asignaciones
--    leyendo de NEW.raw_user_meta_data. Ejemplo de las líneas a incorporar en el
--    INSERT INTO public.profiles (...) de tu trigger:
--
--      acepto_condiciones_plan_gratuito =
--        COALESCE((NEW.raw_user_meta_data->>'acepto_condiciones_plan_gratuito')::boolean, false),
--      fecha_aceptacion_plan_gratuito =
--        NULLIF(NEW.raw_user_meta_data->>'fecha_aceptacion_plan_gratuito','')::timestamptz
--
--    (El cliente ya envía estos campos en options.data del signUp y, en el flujo
--     sin confirmación de email, también los escribe directamente vía upsert.)
