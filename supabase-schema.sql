-- =====================================================
-- o²Wave — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email               TEXT NOT NULL,
  nombre_entidad      TEXT,
  tipo_entidad        TEXT CHECK (tipo_entidad IN ('ong', 'pyme', 'autonomo')),
  sector              TEXT,
  web_url             TEXT,
  plan                TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basico', 'pro', 'enterprise')),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. BRAND IDENTITY
CREATE TABLE IF NOT EXISTS public.brand_identity (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  colores      JSONB DEFAULT '[]',
  tipografia   TEXT,
  estilo       TEXT,
  logo_url     TEXT,
  web_url      TEXT,
  raw_analysis JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brand_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own brand identity"
  ON public.brand_identity FOR ALL USING (auth.uid() = user_id);


-- 3. GENERATED POSTS
CREATE TABLE IF NOT EXISTS public.generated_posts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  red_social      TEXT NOT NULL,
  formato         TEXT,
  texto           TEXT,
  imagen_url      TEXT,
  tema            TEXT,
  tono            TEXT,
  tipo_entidad    TEXT,
  nombre_entidad  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own posts"
  ON public.generated_posts FOR ALL USING (auth.uid() = user_id);


-- 4. KEY DATES (community-wide, admin-managed)
CREATE TABLE IF NOT EXISTS public.key_dates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT NOT NULL,
  fecha       DATE NOT NULL,
  sector      TEXT[] DEFAULT '{}',
  descripcion TEXT,
  tipo        TEXT DEFAULT 'general',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.key_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read key dates"
  ON public.key_dates FOR SELECT USING (auth.role() = 'authenticated');


-- 5. SAMPLE KEY DATES
INSERT INTO public.key_dates (nombre, fecha, sector, descripcion, tipo) VALUES
  ('Día Mundial del Medio Ambiente',    '2025-06-05', ARRAY['medio_ambiente', 'ong'], 'Concienciación ambiental global', 'internacional'),
  ('Día Internacional de la Mujer',     '2025-03-08', ARRAY['ong', 'social', 'general'], 'Igualdad de género', 'internacional'),
  ('Día Mundial de la Salud',           '2025-04-07', ARRAY['salud', 'ong'], 'OMS - Salud para todos', 'internacional'),
  ('Día de la Educación',               '2025-01-24', ARRAY['educacion', 'ong'], 'UNESCO', 'internacional'),
  ('Black Friday',                      '2025-11-28', ARRAY['pyme', 'autonomo', 'comercio'], 'Campaña comercial', 'comercial'),
  ('Vuelta al Cole',                    '2025-09-10', ARRAY['educacion', 'pyme', 'autonomo'], 'Campaña septiembre', 'comercial'),
  ('Navidad',                           '2025-12-25', ARRAY['general', 'pyme', 'autonomo', 'ong'], 'Felicitación navideña', 'festivo'),
  ('Año Nuevo',                         '2026-01-01', ARRAY['general', 'pyme', 'autonomo', 'ong'], 'Feliz 2026', 'festivo'),
  ('Día de San Valentín',               '2025-02-14', ARRAY['pyme', 'autonomo', 'comercio'], 'Campaña amor', 'comercial'),
  ('Día de la Madre',                   '2025-05-04', ARRAY['pyme', 'autonomo', 'comercio'], 'Primera semana de mayo', 'comercial'),
  ('Día Mundial de los Derechos Humanos','2025-12-10', ARRAY['ong', 'social'], 'ONU', 'internacional'),
  ('Día Mundial del Voluntariado',      '2025-12-05', ARRAY['ong', 'social'], 'ONU', 'internacional')
ON CONFLICT DO NOTHING;
