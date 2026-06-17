-- Migración: programa opt-in de mención a Generación o2 con 10% de descuento
-- Fecha: 2026-06-17
--
-- 1) Flag en profiles: el usuario acepta (voluntariamente) que sus posts
--    incluyan una mención discreta a Generación o2 a cambio de un 10% de
--    descuento en su cuota mensual.
-- 2) Tabla de trazabilidad de consentimiento (RGPD): un registro por cada
--    activación/desactivación, con timestamp y user_id.
--
-- Ejecutar en: Supabase → SQL Editor. (No la apliques desde el código.)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acepta_mencion_go2 BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.logs_consentimiento (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,          -- p.ej. 'mencion_go2'
  evento      TEXT NOT NULL,          -- 'activado' | 'desactivado'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_consentimiento_user ON public.logs_consentimiento (user_id, created_at);

-- RLS: el usuario puede leer sus propios registros; la escritura la hace el
-- backend con service role (no hay policy de insert para el usuario).
ALTER TABLE public.logs_consentimiento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_consentimiento_propios" ON public.logs_consentimiento;
CREATE POLICY "logs_consentimiento_propios" ON public.logs_consentimiento
  FOR SELECT USING (auth.uid() = user_id);
