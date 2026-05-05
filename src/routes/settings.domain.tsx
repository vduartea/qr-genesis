import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenant } from "@/hooks/useTenant";
import { CNAME_TARGET } from "@/lib/domainConfig";
import { verifyTenantDomain } from "@/server/domain.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings/domain")({
  head: () => ({
    meta: [
      { title: "Conectar dominio — Quark" },
      {
        name: "description",
        content: "Guía paso a paso para conectar tu dominio personalizado vía CNAME.",
      },
    ],
  }),
  component: ConnectDomainPage,
});

const STATUS_LABEL: Record<string, string> = {
  not_configured: "No configurado",
  pending: "Pendiente de verificación",
  verified: "Verificado",
  error: "Error",
};

const STATUS_VARIANT: Record<
  string,
  "secondary" | "default" | "destructive" | "outline"
> = {
  not_configured: "outline",
  pending: "secondary",
  verified: "default",
  error: "destructive",
};

function deriveHost(domain: string | null): string {
  if (!domain) return "qr";
  const parts = domain.split(".");
  return parts.length > 2 ? parts[0] : "qr";
}

function ConnectDomainPage() {
  const { tenant, loading, saveDomain, refresh } = useTenant();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setValue(tenant?.custom_domain ?? "");
  }, [tenant?.custom_domain]);

  const status = tenant?.custom_domain_status ?? "not_configured";
  const hasDomain = !!tenant?.custom_domain;
  const host = deriveHost(tenant?.custom_domain ?? value);

  const onSave = async () => {
    setBusy(true);
    try {
      await saveDomain(value);
      toast.success("Dominio guardado correctamente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar el dominio");
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const onVerify = async () => {
    setVerifying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Debes iniciar sesión.");
        return;
      }
      const result = await verifyTenantDomain({ data: { accessToken } });
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      await refresh();
    } catch {
      toast.error("No se pudo verificar el dominio en este momento.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SiteLayout>
      <PageContainer>
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Volver al dashboard
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Conectar dominio
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sigue los pasos para apuntar tu subdominio a Quark mediante un registro CNAME.
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[status]} className="self-start md:self-auto">
            {STATUS_LABEL[status]}
          </Badge>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-muted-foreground">Cargando tenant…</p>
        )}

        <div className="mt-8 space-y-6">
          {/* Paso 1 */}
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Paso 1 · Elegir subdominio
              </CardTitle>
              <CardDescription>
                Indica el subdominio que quieres conectar (ej: qr.tutienda.com).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain-input">Dominio</Label>
                <Input
                  id="domain-input"
                  placeholder="qr.tutienda.com"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  Sin "https://" y sin "/" al final.
                </p>
              </div>
              <Button onClick={onSave} disabled={busy || !value.trim()}>
                Guardar dominio
              </Button>
            </CardContent>
          </Card>

          {/* Paso 2 */}
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Paso 2 · Configurar DNS
              </CardTitle>
              <CardDescription>
                Crea este registro en el panel DNS de tu proveedor de dominio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasDomain ? (
                <p className="text-sm text-muted-foreground">
                  Primero guarda un dominio en el Paso 1 para ver los datos exactos.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nombre / Host</TableHead>
                        <TableHead>Valor / Destino</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono">CNAME</TableCell>
                        <TableCell className="font-mono">{host}</TableCell>
                        <TableCell className="font-mono">{CNAME_TARGET}</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copy(CNAME_TARGET)}
                            aria-label="Copiar valor"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paso 3 */}
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Paso 3 · Esperar propagación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Los cambios DNS pueden tardar desde unos minutos hasta varias horas en
                propagarse.
              </p>
            </CardContent>
          </Card>

          {/* Paso 4 */}
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Paso 4 · Verificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={onVerify} disabled={!hasDomain || verifying}>
                {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                Verificar dominio
              </Button>
              {!hasDomain && (
                <p className="text-xs text-muted-foreground">
                  Guarda primero un dominio en el Paso 1.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </SiteLayout>
  );
}