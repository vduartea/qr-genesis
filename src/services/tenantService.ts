import { supabase } from "@/integrations/supabase/client";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  custom_domain_status: "not_configured" | "pending" | "verified" | "error";
  custom_domain_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCurrentTenant(): Promise<Tenant | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  if (pErr) throw pErr;
  const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
  if (!tenantId) return null;

  const { data, error } = await supabase
    .from("tenants" as never)
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return (data as Tenant | null) ?? null;
}

export async function updateTenantName(id: string, name: string): Promise<Tenant> {
  const { data, error } = await supabase
    .from("tenants" as never)
    .update({ name } as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Tenant;
}

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

export function validateCustomDomain(input: string): string {
  const d = normalizeDomain(input);
  if (!d) throw new Error("Dominio vacío");
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d)) {
    throw new Error("Dominio inválido. Ejemplo: qr.tutienda.com");
  }
  return d;
}

export async function setCustomDomain(id: string, domain: string): Promise<Tenant> {
  const normalized = validateCustomDomain(domain);
  const { data, error } = await supabase
    .from("tenants" as never)
    .update({ custom_domain: normalized } as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Tenant;
}

export async function clearCustomDomain(id: string): Promise<Tenant> {
  const { data, error } = await supabase
    .from("tenants" as never)
    .update({ custom_domain: null } as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Tenant;
}
