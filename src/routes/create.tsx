import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, Loader2, Save, Sparkles } from "lucide-react";
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
import { createQr } from "@/services/qrService";
import { buildRedirectUrl } from "@/lib/qrUrl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  validateTimeRules,
  type TimeRule,
  type TimeRuleValidationError,
} from "@/lib/timeRules";
import { TimeRulesEditor } from "@/components/qr/TimeRulesEditor";
import { DesignPanel } from "@/components/qr/DesignPanel";
import { StyledQrPreview, type StyledQrPreviewHandle } from "@/components/qr/StyledQrPreview";
import { DEFAULT_QR_DESIGN, type QrDesign } from "@/lib/qrDesign";

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
  const previewRef = useRef<StyledQrPreviewHandle>(null);
  // Guard against duplicate auto-execution after login (StrictMode + auth events).
  const autoRanRef = useRef(false);

  const [value, setValue] = useState("https://quark.app");
  const [name, setName] = useState("");
  const [design, setDesign] = useState<QrDesign>(DEFAULT_QR_DESIGN);
  const [size] = useState(256);
  const [expiresAt, setExpiresAt] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [timeRules, setTimeRules] = useState<TimeRule[]>([]);
  const [timeRuleErrors, setTimeRuleErrors] = useState<TimeRuleValidationError[]>([]);
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingAction, setLocalPendingAction] = useState<PendingAction>(null);
  const [saving, setSaving] = useState(false);
  // After a successful save, the encoded value flips from the user's raw
  // destination URL to the dynamic /r/{id} URL backed by the new record.
  const [savedRedirectUrl, setSavedRedirectUrl] = useState<string | null>(null);

  // Preview/encoded value priority:
  //  1. Guest → fixed demo URL (no real value extractable).
  //  2. Authenticated + saved → dynamic /r/{id} URL (the real product output).
  //  3. Authenticated + unsaved → raw input URL (live preview).
  const previewValue = useMemo(() => {
    if (!user) return DEMO_PREVIEW_URL;
    if (savedRedirectUrl) return savedRedirectUrl;
    return value;
  }, [user, value, savedRedirectUrl]);
  const isDemo = !user;

  // Restore pending QR on mount
  useEffect(() => {
    const restored = loadPendingQr();
    if (restored) {
      setValue(restored.value);
      if (restored.name) setName(restored.name);
      setDesign((d) => ({
        ...d,
        fgColor: restored.fgColor,
        bgColor: restored.bgColor,
      }));
    }
  }, []);

  const doDownload = useCallback(async () => {
    if (!user) {
      // Safety net — never download from a guest preview (which is the demo QR).
      return;
    }
    const safeName = (name.trim() || "quark-qr")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "quark-qr";
    try {
      await previewRef.current?.download(`${safeName}-${Date.now()}`);
      toast.success("QR descargado");
    } catch {
      toast.error("No se pudo generar la imagen");
    }
  }, [user, name]);

  const doSave = useCallback(async () => {
    if (!user) return;
    if (!value.trim()) {
      toast.error("Necesitas una URL para guardar el QR");
      return;
    }
    // Validate expiration / fallback pair before hitting the network.
    let expiresIso: string | null = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (Number.isNaN(d.getTime())) {
        toast.error("Fecha de expiración inválida");
        return;
      }
      expiresIso = d.toISOString();
      const fb = fallbackUrl.trim();
      if (!fb) {
        setFallbackError("La URL de fallback es obligatoria si defines una expiración");
        toast.error("Falta la URL de fallback para la expiración");
        return;
      }
      try {
        const u = new URL(fb);
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      } catch {
        setFallbackError("Debe ser una URL válida (http:// o https://)");
        toast.error("URL de fallback inválida");
        return;
      }
    }
    setFallbackError(null);
    // Validate time rules
    const trErrors = validateTimeRules(timeRules);
    if (trErrors.length > 0) {
      setTimeRuleErrors(trErrors);
      toast.error("Revisa las reglas de horario");
      return;
    }
    setTimeRuleErrors([]);
    if (saving) return;
    setSaving(true);
    const toastId = toast.loading("Guardando tu QR...");
    try {
      const created = await createQr({
        name: name.trim() || "QR sin nombre",
        destination_url: value.trim(),
        type: "url",
        expires_at: expiresIso,
        fallback_url: expiresIso ? fallbackUrl.trim() : null,
        time_rules: timeRules.map((r) => ({ ...r, url: r.url.trim() })),
        design,
      });
      // Switch the live preview to the dynamic redirect URL so any
      // subsequent download embeds /r/{id}, not the raw destination.
      setSavedRedirectUrl(buildRedirectUrl(created.id));
      toast.success("Tu QR ha sido guardado en tu cuenta", {
        id: toastId,
        description: `"${created.name}" está disponible en tu dashboard.`,
        action: {
          label: "Ver dashboard",
          onClick: () => {
            window.location.href = "/dashboard";
          },
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("No se pudo guardar el QR", { id: toastId, description: msg });
    } finally {
      setSaving(false);
    }
  }, [user, value, name, saving, expiresAt, fallbackUrl, timeRules, design]);

  // After login, auto-resume pending action (runs once per session).
  useEffect(() => {
    if (loading || !user) return;
    if (autoRanRef.current) return;
    const pending = getPendingAction();
    if (!pending) return;
    autoRanRef.current = true;
    clearPendingAction();
    // Small delay so canvas is mounted with the real (post-login) value.
    const t = setTimeout(() => {
      if (pending === "download") {
        void doDownload();
        clearPendingQr();
      } else if (pending === "save") {
        void doSave().finally(() => clearPendingQr());
      }
    }, 250);
    return () => clearTimeout(t);
  }, [user, loading, doDownload, doSave]);

  const triggerProtectedAction = (action: "save" | "download") => {
    if (user) {
      if (action === "download") void doDownload();
      else void doSave();
      return;
    }
    // Persist progress + intent, then open gate
    savePendingQr({ value, name, fgColor: design.fgColor, bgColor: design.bgColor, size });
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

              <Accordion
                type="multiple"
                className="rounded-lg border border-border/60"
              >
                <AccordionItem
                  value="expiration"
                  className="border-b border-border/60 px-3"
                >
                  <AccordionTrigger className="text-sm font-medium">
                    Expiración del QR
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-1">
                    <div className="space-y-2">
                      <Label htmlFor="qr-expires">Fecha de expiración</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qr-expires"
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => {
                            setExpiresAt(e.target.value);
                            if (!e.target.value) setFallbackError(null);
                          }}
                        />
                        {expiresAt && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setExpiresAt("");
                              setFallbackError(null);
                            }}
                          >
                            Quitar
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pasada esta fecha, el QR redirigirá a la URL de fallback durante 5 segundos.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qr-fallback">URL después de expiración</Label>
                      <Input
                        id="qr-fallback"
                        type="url"
                        value={fallbackUrl}
                        onChange={(e) => {
                          setFallbackUrl(e.target.value);
                          if (fallbackError) setFallbackError(null);
                        }}
                        placeholder="https://ejemplo.com/expirado"
                        disabled={!expiresAt}
                      />
                      {fallbackError ? (
                        <p className="text-xs text-destructive">{fallbackError}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Obligatoria solo si defines una fecha de expiración.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="schedule" className="px-3">
                  <AccordionTrigger className="text-sm font-medium">
                    Redirección por horario
                  </AccordionTrigger>
                  <AccordionContent className="pt-1">
                    <TimeRulesEditor
                      rules={timeRules}
                      onChange={(next) => {
                        setTimeRules(next);
                        if (timeRuleErrors.length > 0) setTimeRuleErrors([]);
                      }}
                      errors={timeRuleErrors}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

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
                  disabled={!value.trim() || saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Guardando..." : "Guardar en mi cuenta"}
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
