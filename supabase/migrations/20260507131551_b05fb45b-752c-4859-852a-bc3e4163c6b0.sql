-- Stage 8: per-scan tracking with tenant + host attribution.

CREATE TABLE IF NOT EXISTS public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  host text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON public.qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_tenant_id ON public.qr_scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON public.qr_scans(scanned_at DESC);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Owners (authenticated users in the same tenant) can read their scans.
CREATE POLICY "Users can view scans of their tenant"
ON public.qr_scans
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- No public insert/update/delete. Inserts go through SECURITY DEFINER RPC.

-- Atomic record + increment, evaluating active + expiration server-side.
-- Returns true when the scan was recorded.
CREATE OR REPLACE FUNCTION public.record_qr_scan(_qr_id uuid, _host text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
BEGIN
  SELECT tenant_id INTO _tenant
  FROM public.qr_codes
  WHERE id = _qr_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF _tenant IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.qr_scans (qr_code_id, tenant_id, host)
  VALUES (_qr_id, _tenant, NULLIF(trim(_host), ''));

  UPDATE public.qr_codes
     SET scan_count = scan_count + 1,
         updated_at = now()
   WHERE id = _qr_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_qr_scan(uuid, text) TO anon, authenticated;
