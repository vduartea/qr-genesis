
-- Allow anonymous (public) read of active QR codes for redirect resolution.
-- This is required so /r/{id} can resolve the destination URL without
-- requiring the service role key (which is not exposed to the Worker runtime).
-- Only minimal fields are read by the application (id, destination_url, is_active).
CREATE POLICY "Public can read active qr_codes for redirect"
ON public.qr_codes
FOR SELECT
TO anon
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- Allow anon and authenticated roles to call the scan increment RPC.
-- The function is SECURITY DEFINER and only updates scan_count safely.
GRANT EXECUTE ON FUNCTION public.increment_qr_scan(uuid) TO anon, authenticated;
