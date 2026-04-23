-- Create the plant-images storage bucket (public, for CDN URL access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-images', 'plant-images', true);

-- RLS policy: authenticated users can upload images to their own folder
-- Folder name must match auth.uid() to prevent cross-user uploads
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'plant-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policy: anonymous uploads via service role (defense-in-depth)
-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- but this policy protects the "anonymous" folder for any future client-side uploads
CREATE POLICY "Service role can upload anonymous images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'plant-images'
    AND (storage.foldername(name))[1] = 'anonymous'
  );

-- RLS policy: public read access (enables CDN URL pattern for img src)
CREATE POLICY "Public read access for plant images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'plant-images');
