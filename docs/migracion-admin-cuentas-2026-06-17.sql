-- Migración: panel admin de gestión de cuentas (/admin/cuentas)
-- Fecha: 2026-06-17
--
-- 1) Suspensión de cuentas: flag en profiles. Una cuenta suspendida es
--    redirigida a /suspendida y no accede al servicio (lo aplica el middleware).
-- 2) Auditoría: tabla de acciones del admin (suspender, eliminar, verificación…).
--
-- Ejecutar en: Supabase → SQL Editor. (No la apliques desde el código.)
-- El middleware lee cuenta_suspendida de forma resiliente: si la columna aún no
-- existe, no bloquea a nadie.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cuenta_suspendida BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.logs_admin_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  accion          TEXT NOT NULL,          -- 'suspender' | 'reactivar' | 'eliminar' | 'verificar' | 'rechazar' | 'pedir_info'
  target_user_id  UUID,                   -- sin FK: debe sobrevivir al borrado del usuario objetivo
  motivo          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_admin_target ON public.logs_admin_actions (target_user_id, created_at);

-- RLS: solo lectura para admins. La escritura la hace el backend con service role.
ALTER TABLE public.logs_admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_admin_lectura" ON public.logs_admin_actions;
CREATE POLICY "logs_admin_lectura" ON public.logs_admin_actions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.es_admin));
