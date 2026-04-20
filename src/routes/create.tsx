import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Eye, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { AuthGateDialog } from "@/components/auth/AuthGateDialog";
import {
  clearPendingAction,
  clearPendingQr,
  getPendingAction,
  loadPendingQr,
  savePendingQr,
  setPendingAction,
  type PendingAction,
} from "@/lib/pendingQr";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Crear QR — Quark" },
      { name: "description", content: "Genera un código QR al instante. Pruébalo sin registrarte." },
      { property: "og:title", content: "Crear QR — Quark" },
      { property: "og:description", content: "Genera un código QR al instante. Pruébalo sin registrarte." },
    ],
  }),
  component: CreatePage,
});

// Fixed demo URL for the preview while unauthenticated.
// Prevents guests from extracting a working QR before signing up.
const DEMO_PREVIEW_URL = "https://qr-genesis.lovable.app";

function CreatePage() {
  const { user, loading } = useAuth();
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState("https://quark.app");
  const [name, setName] = useState("");
  const [fgColor, setFgColor] = useState("#0F172A");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [size] = useState(256);
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingAction, setLocalPendingAction] = useState<PendingAction>(null);

  // Preview uses the user's real URL only after auth; otherwise a fixed demo URL.
  const previewValue = useMemo(
    () => (user ? value : DEMO_PREVIEW_URL),
    [user, value],
  );
  const isDemo = !user;

  // Restore pending QR on mount
  useEffect(() => {
    const restored = loadPendingQr();
    if (restored) {
      setValue(restored.value);
      if (restored.name) setName(restored.name);
      setFgColor(restored.fgColor);
      setBgColor(restored.bgColor);
    }
  }, []);

  // After login, auto-resume pending action
  useEffect(() => {
    if (loading || !user) return;
    const pending = getPendingAction();
    if (!pending) return;
    clearPendingAction();
    // Small delay so canvas is mounted
    const t = setTimeout(() => {
      if (pending === "download") doDownload();
      else if (pending === "save") doSave();
      clearPendingQr();
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const doDownload = () => {
    if (!user) {
      // Safety net — never download from a guest preview (which is the demo QR).
      return;
    }
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) {
      toast.error("No se pudo generar la imagen");
      return;
    }
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    const safeName = (name.trim() || "quark-qr")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "quark-qr";
    a.download = `${safeName}-${Date.now()}.png`;
    a.click();
    toast.success("QR descargado");
  };

  const doSave = () => {
    // Real persistence comes in next stage — simulate with feedback.
    toast.success("QR guardado en tu cuenta", {
      description: "La gestión completa de QRs llega pronto.",
    });
  };

  const triggerProtectedAction = (action: "save" | "download") => {
    if (user) {
      action === "download" ? doDownload() : doSave();
      return;
    }
    // Persist progress + intent, then open gate
    savePendingQr({ value, name, fgColor, bgColor, size });
    setPendingAction(action);
    setLocalPendingAction(action);
    setGateOpen(true);
  };

  return (
    <SiteLayout>
      <PageContainer>
        <div className="mb-8 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-elevated px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Pruébalo gratis — sin registro
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Crea tu código QR
          </h1>
          <p className="mt-2 text-muted-foreground">
            Personalízalo en segundos. Solo necesitas una cuenta para guardarlo o descargarlo.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3 border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-xl">Contenido</CardTitle>
              <CardDescription>Define qué codifica tu QR y su apariencia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="qr-name">Nombre (opcional)</Label>
                <Input
                  id="qr-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mi QR de campaña"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-value">Texto o URL</Label>
                <Input
                  id="qr-value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="https://tu-enlace.com"
                  maxLength={1000}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="qr-fg">Color principal</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="qr-fg"
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
                    />
                    <Input value={fgColor} onChange={(e) => setFgColor(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qr-bg">Fondo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="qr-bg"
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
                    />
                    <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1"
                  onClick={() => triggerProtectedAction("download")}
                  disabled={!value.trim()}
                >
                  <Download className="h-4 w-4" />
                  Descargar PNG
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => triggerProtectedAction("save")}
                  disabled={!value.trim()}
                >
                  <Save className="h-4 w-4" />
                  Guardar en mi cuenta
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-xl">Vista previa</CardTitle>
              <CardDescription>
                {isDemo
                  ? "Demostración con una URL fija."
                  : "QR real con tu URL — listo para descargar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                ref={canvasWrapRef}
                className="relative flex aspect-square items-center justify-center rounded-2xl border border-border/60 bg-surface p-6"
              >
                <QRCodeCanvas
                  value={previewValue}
                  size={size}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level="M"
                  includeMargin
                />
                {isDemo && (
                  <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-elevated/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-soft backdrop-blur">
                    <Eye className="h-3 w-3 text-accent" />
                    Demo
                  </div>
                )}
              </div>
              {isDemo ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Estás viendo una <span className="font-medium text-foreground">vista previa de demostración</span>.
                  El QR no apunta a tu URL todavía — <span className="font-medium text-foreground">regístrate para generar tu QR real</span>.
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Este QR apunta a <span className="font-medium text-foreground break-all">{value || "tu URL"}</span>.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>

      <AuthGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        action={pendingAction}
        redirectTo="/create"
      />
    </SiteLayout>
  );
}
