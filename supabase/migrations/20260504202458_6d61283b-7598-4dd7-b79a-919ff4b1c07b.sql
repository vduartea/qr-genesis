
-- 1. Tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add tenant_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);

-- 3. Add tenant_id to qr_codes
ALTER TABLE public.qr_codes
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_qr_codes_tenant_id ON public.qr_codes(tenant_id);

-- 4. Security definer helper to get current user's tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- 5. RLS policies for tenants — user can view & update their own tenant
CREATE POLICY "Users can view their own tenant"
ON public.tenants FOR SELECT
USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update their own tenant"
ON public.tenants FOR UPDATE
USING (id = public.get_user_tenant_id(auth.uid()));

-- 6. Slug generator
CREATE OR REPLACE FUNCTION public.generate_tenant_slug(_base text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  counter int := 0;
BEGIN
  base_slug := lower(regexp_replace(coalesce(_base, 'tenant'), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'tenant'; END IF;
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = candidate) LOOP
    counter := counter + 1;
    candidate := base_slug || '-' || counter::text;
  END LOOP;
  RETURN candidate;
END;
$$;

-- 7. Replace handle_new_user to also create a tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
  _slug text;
  _tenant_id uuid;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1));
  _slug := public.generate_tenant_slug(_name);

  INSERT INTO public.tenants (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _tenant_id;

  INSERT INTO public.profiles (user_id, email, display_name, tenant_id)
  VALUES (NEW.id, NEW.email, _name, _tenant_id);

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Backfill tenants for existing users
DO $$
DECLARE
  r RECORD;
  _slug text;
  _tenant_id uuid;
BEGIN
  FOR r IN SELECT user_id, email, display_name FROM public.profiles WHERE tenant_id IS NULL LOOP
    _slug := public.generate_tenant_slug(COALESCE(r.display_name, split_part(r.email, '@', 1)));
    INSERT INTO public.tenants (name, slug)
    VALUES (COALESCE(r.display_name, split_part(r.email, '@', 1)), _slug)
    RETURNING id INTO _tenant_id;
    UPDATE public.profiles SET tenant_id = _tenant_id WHERE user_id = r.user_id;
    UPDATE public.qr_codes SET tenant_id = _tenant_id WHERE user_id = r.user_id AND tenant_id IS NULL;
  END LOOP;
END $$;

-- 9. Make tenant_id required going forward
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;

-- qr_codes tenant_id: set default fill via trigger before requiring NOT NULL
CREATE OR REPLACE FUNCTION public.set_qr_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_qr_tenant_id_before_insert
BEFORE INSERT ON public.qr_codes
FOR EACH ROW EXECUTE FUNCTION public.set_qr_tenant_id();

ALTER TABLE public.qr_codes ALTER COLUMN tenant_id SET NOT NULL;

-- 10. Update qr_codes RLS to also enforce tenant scoping
DROP POLICY IF EXISTS "Users can view their own qr_codes" ON public.qr_codes;
CREATE POLICY "Users can view their own qr_codes"
ON public.qr_codes FOR SELECT
USING (auth.uid() = user_id AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own qr_codes" ON public.qr_codes;
CREATE POLICY "Users can insert their own qr_codes"
ON public.qr_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own qr_codes" ON public.qr_codes;
CREATE POLICY "Users can update their own qr_codes"
ON public.qr_codes FOR UPDATE
USING (auth.uid() = user_id AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own qr_codes" ON public.qr_codes;
CREATE POLICY "Users can delete their own qr_codes"
ON public.qr_codes FOR DELETE
USING (auth.uid() = user_id AND tenant_id = public.get_user_tenant_id(auth.uid()));
