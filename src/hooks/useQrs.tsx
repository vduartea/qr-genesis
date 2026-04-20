import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  createQr,
  deleteQr,
  listQrsByCurrentUser,
  updateQr,
  type CreateQrInput,
  type QrCode,
  type QrCodeUpdate,
} from "@/services/qrService";

interface UseQrsResult {
  qrs: QrCode[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: CreateQrInput) => Promise<QrCode>;
  update: (id: string, patch: QrCodeUpdate) => Promise<QrCode>;
  remove: (id: string) => Promise<void>;
}

/**
 * Hook to manage the authenticated user's QR collection.
 * Returns empty list (no fetch) when there is no session.
 */
export function useQrs(): UseQrsResult {
  const { user, loading: authLoading } = useAuth();
  const [qrs, setQrs] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setQrs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listQrsByCurrentUser();
      setQrs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los QRs");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const create = useCallback(async (input: CreateQrInput) => {
    const created = await createQr(input);
    setQrs((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: QrCodeUpdate) => {
    const updated = await updateQr(id, patch);
    setQrs((prev) => prev.map((q) => (q.id === id ? updated : q)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteQr(id);
    setQrs((prev) => prev.filter((q) => q.id !== id));
  }, []);

  return { qrs, loading, error, refresh, create, update, remove };
}
