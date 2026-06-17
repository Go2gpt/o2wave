-- Migración: tabla premios_eventos (Plan Estrella MVP — Fase 1)
-- Fecha: 2026-06-17
--
-- Catálogo de premios/eventos para enriquecer automáticamente los posts de
-- agradecimiento (hashtag oficial, cuentas oficiales, etc.). El código detecta
-- el premio buscando las `keywords` dentro del tema del usuario.
--
-- Ejecutar en: Supabase → SQL Editor. La feature es resiliente: si esta tabla
-- aún no existe, la generación de contenido sigue funcionando con normalidad.

CREATE TABLE IF NOT EXISTS public.premios_eventos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT UNIQUE NOT NULL,
  nombre             TEXT NOT NULL,
  sector             TEXT NOT NULL,          -- 'cine' | 'tv' | 'musica' | 'deporte' | 'literatura'
  pais               TEXT DEFAULT 'ES',
  hashtag_oficial    TEXT,
  instagram_oficial  TEXT,
  twitter_oficial    TEXT,
  web_oficial        TEXT,
  mes_celebracion    INTEGER,                -- 1=enero … 12=diciembre
  keywords           TEXT[] NOT NULL,        -- en minúsculas y sin tildes
  descripcion        TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premios_keywords ON public.premios_eventos USING gin(keywords);

-- Lectura pública (datos de referencia, no sensibles). La escritura queda
-- restringida (sin policy de insert/update → solo service role la modifica).
ALTER TABLE public.premios_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "premios_lectura" ON public.premios_eventos;
CREATE POLICY "premios_lectura" ON public.premios_eventos FOR SELECT USING (true);

-- 5 premios iniciales (cine + TV de España).
INSERT INTO public.premios_eventos
  (slug, nombre, sector, pais, hashtag_oficial, instagram_oficial, twitter_oficial, web_oficial, mes_celebracion, keywords, descripcion)
VALUES
  ('goya', 'Premios Goya', 'cine', 'ES', '#PremiosGoya', '@premiosgoya', '@PremiosGoya', 'https://www.premiosgoya.com', 1,
    ARRAY['goya','goyas','premios goya','premio goya'],
    'Principales premios del cine español, otorgados por la Academia de las Artes y las Ciencias Cinematográficas de España.'),
  ('feroz', 'Premios Feroz', 'cine', 'ES', '#PremiosFeroz', '@premiosferozaicc', '@PremiosFeroz', 'https://premiosferoz.com', 1,
    ARRAY['premios feroz','premio feroz'],
    'Premios de cine y televisión concedidos por la Asociación de Informadores Cinematográficos de España (AICC).'),
  ('forque', 'Premios José María Forqué', 'cine', 'ES', '#PremiosForqué', '@premiosforque', '@PremiosForque', 'https://www.premiosforque.com', 12,
    ARRAY['forque','forques','premios forque','premio forque','jose maria forque'],
    'Premios cinematográficos otorgados por EGEDA (Entidad de Gestión de Derechos de los Productores Audiovisuales).'),
  ('gaudi', 'Premis Gaudí', 'cine', 'ES', '#PremisGaudí', '@academiadelcinema', '@AcademiaCinema', 'https://www.academiadelcinema.cat', 1,
    ARRAY['gaudi','gaudis','premis gaudi','premios gaudi','premi gaudi'],
    'Premios del cine catalán otorgados por la Acadèmia del Cinema Català.'),
  ('iris', 'Premios Iris', 'tv', 'ES', '#PremiosIris', '@atvespana', '@ATV_es', 'https://www.atv-academiatv.com', 6,
    ARRAY['premios iris','premio iris','premios iris atv','iris de la academia'],
    'Premios de la Academia de las Ciencias y las Artes de Televisión de España.')
ON CONFLICT (slug) DO NOTHING;
