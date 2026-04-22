-- Atomic increment of scan_count for an active, non-expired QR.
-- SECURITY DEFINER so it can be invoked from the server handler (which uses the
-- service role anyway) and, in the future, from anon contexts if ever needed,
-- without depending on RLS for this specific counter operation.
CREATE OR REPLACE FUNCTION public.increment_qr_scan(_qr_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.qr_codes
     SET scan_count = scan_count + 1,
         updated_at = now()
   WHERE id = _qr_id
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > now());
END;
$$;