ALTER TABLE public.qr_codes
  ADD COLUMN IF NOT EXISTS public_qr_url text;

CREATE OR REPLACE FUNCTION public.set_qr_public_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _domain text;
  _status text;
BEGIN
  IF NEW.public_qr_url IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT custom_domain, custom_domain_status
    INTO _domain, _status
  FROM public.tenants
  WHERE id = NEW.tenant_id;

  IF _domain IS NOT NULL AND _status = 'verified' THEN
    NEW.public_qr_url := 'https://' || _domain || '/q/' || NEW.id::text;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_qr_public_url ON public.qr_codes;
CREATE TRIGGER trg_set_qr_public_url
BEFORE INSERT ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.set_qr_public_url();
