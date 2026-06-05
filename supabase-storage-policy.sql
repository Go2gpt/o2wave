-- =====================================================
-- o²Wave — Storage: bucket "post-images" + políticas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================
--
-- NOTA: además de este SQL, crea el bucket en
-- Storage → New bucket → name = "post-images" → marca "Public bucket".
-- (O usa el INSERT de abajo, que lo crea como público.)

-- 1. Crear el bucket como público (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Lectura pública de los objetos del bucket
--    (necesaria para que getPublicUrl sirva la imagen)
CREATE POLICY "Public read post-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

-- 3. Subida: cada usuario autenticado solo puede subir a su carpeta {user_id}/...
CREATE POLICY "Users upload own post-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. (Opcional) Borrado de las propias imágenes
CREATE POLICY "Users delete own post-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
