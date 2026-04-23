ALTER TABLE public.qr_codes
  ADD COLUMN IF NOT EXISTS fallback_url text;

COMMENT ON COLUMN public.qr_codes.fallback_url IS
  'Optional URL to redirect to once the QR has expired (expires_at < now()).';