import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isSaasHost } from "@/lib/domainConfig";

export type TenantResolution =
  | { kind: "saas"; host: string | null }
  | {
      kind: "tenant";
      host: string;
      tenant: {
        id: string;
        custom_domain: string;
        custom_domain_status: string;
      };
    }
  | { kind: "not_found"; host: string; message: string };

function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const cleaned = host.trim().toLowerCase().replace(/:\d+$/, "");
  return cleaned || null;
}

/**
 * Resolve the tenant that owns a given incoming host.
 *
 * - SaaS hosts (default app domain, localhost) → `{ kind: "saas" }`.
 * - Verified custom domain → `{ kind: "tenant", tenant }`.
 * - Unknown / unverified custom domain → `{ kind: "not_found" }`.
 *
 * Only domains with `custom_domain_status = "verified"` are accepted.
 * Uses the public (anon) Supabase client; RLS allows anon read of tenants
 * is NOT required — we use the service role here because tenant resolution
 * must work for unauthenticated public traffic hitting custom domains.
 */
export async function resolveTenantByHost(
  rawHost: string | null,
): Promise<TenantResolution> {
  const host = normalizeHost(rawHost);

  if (!host) {
    return { kind: "saas", host: null };
  }

  if (isSaasHost(host)) {
    return { kind: "saas", host };
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return {
      kind: "not_found",
      host,
      message: "Dominio no configurado o no verificado.",
    };
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("tenants")
    .select("id, custom_domain, custom_domain_status")
    .eq("custom_domain", host)
    .eq("custom_domain_status", "verified")
    .maybeSingle();

  if (error || !data || !data.custom_domain) {
    return {
      kind: "not_found",
      host,
      message: "Dominio no configurado o no verificado.",
    };
  }

  return {
    kind: "tenant",
    host,
    tenant: {
      id: data.id,
      custom_domain: data.custom_domain,
      custom_domain_status: data.custom_domain_status,
    },
  };
}