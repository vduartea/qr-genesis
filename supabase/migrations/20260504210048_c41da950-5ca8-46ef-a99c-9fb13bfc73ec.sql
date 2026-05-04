
ALTER TABLE public.tenants
  ADD COLUMN custom_domain text,
  ADD COLUMN custom_domain_status text NOT NULL DEFAULT 'not_configured',
  ADD COLUMN custom_domain_verified_at timestamptz;

CREATE UNIQUE INDEX tenants_custom_domain_unique_idx
  ON public.tenants (custom_domain)
  WHERE custom_domain IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_tenant_custom_domain()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.custom_domain IS NOT NULL THEN
    NEW.custom_domain := lower(trim(NEW.custom_domain));
    NEW.custom_domain := regexp_replace(NEW.custom_domain, '^https?://', '');
    NEW.custom_domain := regexp_replace(NEW.custom_domain, '/+$', '');
    IF NEW.custom_domain = '' THEN
      NEW.custom_domain := NULL;
    ELSIF NEW.custom_domain !~ '^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)+$' THEN
      RAISE EXCEPTION 'Dominio inválido: %', NEW.custom_domain;
    END IF;
  END IF;

  IF NEW.custom_domain IS NULL THEN
    NEW.custom_domain_status := 'not_configured';
    NEW.custom_domain_verified_at := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.custom_domain IS DISTINCT FROM OLD.custom_domain THEN
    NEW.custom_domain_status := 'pending';
    NEW.custom_domain_verified_at := NULL;
  END IF;

  IF NEW.custom_domain_status NOT IN ('not_configured','pending','verified','error') THEN
    RAISE EXCEPTION 'Estado de dominio inválido: %', NEW.custom_domain_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_tenant_custom_domain
BEFORE INSERT OR UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.normalize_tenant_custom_domain();
