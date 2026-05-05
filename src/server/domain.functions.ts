import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

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