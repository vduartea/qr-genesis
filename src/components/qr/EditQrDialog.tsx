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

export function EditQrDialog({ qr, open, onOpenChange }: EditQrDialogProps) {
  const { update } = useQrs();
  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [errors, setErrors] = useState<{ name?: string; url?: string }>({});
  const [saving, setSaving] = useState(false);

  // Sync form state whenever a new QR is opened
  useEffect(() => {
    if (qr) {
      setName(qr.name);
      setDestinationUrl(qr.destination_url);
      setErrors({});
    }
  }, [qr]);

  const handleSave = async () => {
    if (!qr) return;

    const trimmedName = name.trim();
    const trimmedUrl = destinationUrl.trim();
    const nextErrors: { name?: string; url?: string } = {};

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

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Skip the request if nothing actually changed
    if (trimmedName === qr.name && trimmedUrl === qr.destination_url) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await update(qr.id, {
        name: trimmedName,
        destination_url: trimmedUrl,
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
