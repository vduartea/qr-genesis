import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getCurrentTenant,
  updateTenantName,
  setCustomDomain,
  clearCustomDomain,
  type Tenant,
} from "@/services/tenantService";

export function useTenant() {
  const { user, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setTenant(null); return; }
    setLoading(true); setError(null);
    try { setTenant(await getCurrentTenant()); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (!authLoading) void refresh(); }, [authLoading, refresh]);

  const rename = useCallback(async (name: string) => {
    if (!tenant) throw new Error("Sin tenant");
    const updated = await updateTenantName(tenant.id, name);
    setTenant(updated);
    return updated;
  }, [tenant]);

  const saveDomain = useCallback(async (domain: string) => {
    if (!tenant) throw new Error("Sin tenant");
    const updated = await setCustomDomain(tenant.id, domain);
    setTenant(updated);
    return updated;
  }, [tenant]);

  const removeDomain = useCallback(async () => {
    if (!tenant) throw new Error("Sin tenant");
    const updated = await clearCustomDomain(tenant.id);
    setTenant(updated);
    return updated;
  }, [tenant]);

  return { tenant, loading, error, refresh, rename, saveDomain, removeDomain };
}
