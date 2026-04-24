import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQrs } from "@/hooks/useQrs";
import type { QrCode } from "@/services/qrService";

interface EditQrDialogProps {
  qr: QrCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Convert ISO timestamp → value for <input type="datetime-local"> (local TZ). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert <input type="datetime-local"> value (local TZ) → ISO string. */
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function EditQrDialog({ qr, open, onOpenChange }: EditQrDialogProps) {
  const { update } = useQrs();
  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    url?: string;
    fallback?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  // Sync form state whenever a new QR is opened
  useEffect(() => {
    if (qr) {
      setName(qr.name);
      setDestinationUrl(qr.destination_url);
      setExpiresAt(isoToLocalInput(qr.expires_at));
      setFallbackUrl(qr.fallback_url ?? "");
      setErrors({});
    }
  }, [qr]);

  const handleSave = async () => {
    if (!qr) return;

    const trimmedName = name.trim();
    const trimmedUrl = destinationUrl.trim();
    const trimmedFallback = fallbackUrl.trim();
    const nextErrors: { name?: string; url?: string; fallback?: string } = {};

    if (!trimmedName) {
      nextErrors.name = "El nombre no puede estar vacío";
    } else if (trimmedName.length > 100) {
      nextErrors.name = "Máximo 100 caracteres";
    }

    if (!trimmedUrl) {
      nextErrors.url = "La URL es obligatoria";
    } else if (!isValidUrl(trimmedUrl)) {
      nextErrors.url = "Debe ser una URL válida (http:// o https://)";
    }

    const nextExpiresIso = localInputToIso(expiresAt);
    if (nextExpiresIso) {
      if (!trimmedFallback) {
        nextErrors.fallback =
          "La URL de fallback es obligatoria si defines una expiración";
      } else if (!isValidUrl(trimmedFallback)) {
        nextErrors.fallback = "Debe ser una URL válida (http:// o https://)";
      }
    } else if (trimmedFallback && !isValidUrl(trimmedFallback)) {
      nextErrors.fallback = "Debe ser una URL válida (http:// o https://)";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const nextFallback = trimmedFallback || null;

    // Skip the request if nothing actually changed
    if (
      trimmedName === qr.name &&
      trimmedUrl === qr.destination_url &&
      nextExpiresIso === (qr.expires_at ?? null) &&
      nextFallback === (qr.fallback_url ?? null)
    ) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await update(qr.id, {
        name: trimmedName,
        destination_url: trimmedUrl,
        expires_at: nextExpiresIso,
        fallback_url: nextFallback,
      });
      toast.success("QR actualizado correctamente");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el QR");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar QR</DialogTitle>
          <DialogDescription>
            Cambia el destino sin regenerar el código. El QR físico seguirá funcionando.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-qr-name">Nombre</Label>
            <Input
              id="edit-qr-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Mi QR"
              maxLength={100}
              disabled={saving}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-qr-url">URL de destino</Label>
            <Input
              id="edit-qr-url"
              type="url"
              value={destinationUrl}
              onChange={(e) => {
                setDestinationUrl(e.target.value);
                if (errors.url) setErrors((prev) => ({ ...prev, url: undefined }));
              }}
              placeholder="https://ejemplo.com"
              disabled={saving}
            />
            {errors.url ? (
              <p className="text-xs text-destructive">{errors.url}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                El QR seguirá apuntando al mismo enlace dinámico, pero redirigirá aquí.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-qr-expires">Fecha de expiración (opcional)</Label>
            <div className="flex gap-2">
              <Input
                id="edit-qr-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => {
                  setExpiresAt(e.target.value);
                  if (errors.fallback)
                    setErrors((prev) => ({ ...prev, fallback: undefined }));
                }}
                disabled={saving}
              />
              {expiresAt && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExpiresAt("")}
                  disabled={saving}
                >
                  Quitar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pasada esta fecha, el QR redirigirá a la URL de fallback.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-qr-fallback">URL después de expiración</Label>
            <Input
              id="edit-qr-fallback"
              type="url"
              value={fallbackUrl}
              onChange={(e) => {
                setFallbackUrl(e.target.value);
                if (errors.fallback)
                  setErrors((prev) => ({ ...prev, fallback: undefined }));
              }}
              placeholder="https://ejemplo.com/expirado"
              disabled={saving || !expiresAt}
            />
            {errors.fallback ? (
              <p className="text-xs text-destructive">{errors.fallback}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Obligatoria solo si defines una fecha de expiración.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="hero" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
