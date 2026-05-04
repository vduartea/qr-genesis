import { supabase } from "@/integrations/supabase/client";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
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
