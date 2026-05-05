import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CNAME_TARGET } from "@/lib/domainConfig";

function normalizeCname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * Resolve CNAME records via Cloudflare DNS-over-HTTPS (no DNS module needed in Workers).
 * Returns the list of CNAME targets (normalized) or empty array if none.
 */
async function resolveCname(domain: string): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const json = (await res.json()) as { Answer?: Array<{ type: number; data: string }> };
  const answers = json.Answer ?? [];
  // Type 5 = CNAME
  return answers
    .filter((a) => a.type === 5)
    .map((a) => normalizeCname(a.data));
}

export const verifyTenantDomain = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string }) => {
    if (!input?.accessToken || typeof input.accessToken !== "string") {
      throw new Error("Missing access token");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing Supabase env vars");
    }

    // Authenticated client scoped to caller — RLS enforces tenant isolation.
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(data.accessToken);
    if (claimsErr || !claims?.claims?.sub) {
      throw new Error("Unauthorized");
    }
    const userId = claims.claims.sub;

    // Get user's tenant
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) throw new Error("Tenant no encontrado");

    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("id, custom_domain, custom_domain_status")
      .eq("id", tenantId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) throw new Error("Tenant no encontrado");

    const domain = (tenant as { custom_domain: string | null }).custom_domain;
    if (!domain) {
      return { ok: false, status: "not_configured" as const, message: "No hay dominio configurado." };
    }

    const expected = normalizeCname(CNAME_TARGET);

    let targets: string[] = [];
    try {
      targets = await resolveCname(domain);
    } catch {
      return {
        ok: false,
        status: "error" as const,
        message: "No se pudo verificar el dominio en este momento.",
      };
    }

    const matches = targets.some((t) => t === expected);

    if (matches) {
      const { error: uErr } = await supabase
        .from("tenants")
        .update({
          custom_domain_status: "verified",
          custom_domain_verified_at: new Date().toISOString(),
        })
        .eq("id", tenantId);
      if (uErr) throw new Error(uErr.message);
      return { ok: true, status: "verified" as const, message: "Dominio verificado correctamente." };
    }

    await supabase
      .from("tenants")
      .update({
        custom_domain_status: "error",
        custom_domain_verified_at: null,
      })
      .eq("id", tenantId);

    return {
      ok: false,
      status: "error" as const,
      message:
        "No encontramos el CNAME correcto todavía. Revisa la configuración DNS o intenta nuevamente más tarde.",
    };
  });