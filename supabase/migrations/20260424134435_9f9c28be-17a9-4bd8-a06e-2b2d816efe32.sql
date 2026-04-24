DROP POLICY IF EXISTS "Public can read active qr_codes for redirect" ON public.qr_codes;

CREATE POLICY "Public can read non-disabled qr_codes for redirect"
  ON public.qr_codes
  FOR SELECT
  TO anon
  USING (is_active = true);