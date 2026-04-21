import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Trash2, ExternalLink, QrCode as QrCodeIcon } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQrs } from "@/hooks/useQrs";
import type { QrCode } from "@/services/qrService";
import { buildRedirectUrl } from "@/lib/qrUrl";

function shortUrl(url: string, max = 48): string {
  if (url.length <= max) return url;
  return url.slice(0, max - 1) + "…";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "qr-code";
}

function downloadQr(qr: QrCode) {
  const node = document.getElementById(`qr-canvas-${qr.id}`) as HTMLCanvasElement | null;
  if (!node) {
    toast.error("No se pudo generar el archivo");
    return;
  }
  const url = node.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(qr.name)}.png`;
  link.click();
  toast.success("Descarga iniciada");
}

export function QrList() {
  const { qrs, loading, error, remove } = useQrs();
  const [pendingDelete, setPendingDelete] = useState<QrCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await remove(pendingDelete.id);
      toast.success("QR eliminado");
      setPendingDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (qrs.length === 0) {
    return (
      <Card className="border-dashed border-border bg-surface text-center shadow-none">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-soft">
            <QrCodeIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">
              Aún no tienes códigos QR
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea tu primer QR y aparecerá aquí.
            </p>
          </div>
          <Button asChild variant="hero">
            <Link to="/create" search={{ redirect: undefined }}>
              Crear mi primer QR
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {qrs.map((qr) => (
          <Card
            key={qr.id}
            className="group flex flex-col overflow-hidden border-border/60 shadow-soft transition hover:shadow-elegant"
          >
            <div className="flex items-center justify-center bg-surface px-6 py-6">
              <div className="rounded-lg bg-white p-3 shadow-soft">
                <QRCodeCanvas
                  id={`qr-canvas-${qr.id}`}
                  value={buildRedirectUrl(qr.id)}
                  size={120}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 font-display text-base font-semibold">
                  {qr.name}
                </h3>
                {qr.is_active ? (
                  <Badge variant="secondary" className="shrink-0">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    Inactivo
                  </Badge>
                )}
              </div>
              <a
                href={qr.destination_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                title={qr.destination_url}
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{shortUrl(qr.destination_url)}</span>
              </a>
              <p className="text-xs text-muted-foreground">
                Creado el {formatDate(qr.created_at)}
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => downloadQr(qr)}
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setPendingDelete(qr)}
                  aria-label="Eliminar QR"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este QR?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará{" "}
              <span className="font-medium text-foreground">
                {pendingDelete?.name}
              </span>{" "}
              permanentemente de tu cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}