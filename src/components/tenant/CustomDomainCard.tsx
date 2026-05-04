import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { useTenant } from "@/hooks/useTenant";

const STATUS_LABEL: Record<string, string> = {
  not_configured: "No configurado",
  pending: "Pendiente",
  verified: "Verificado",
  error: "Error",
};

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  not_configured: "outline",
  pending: "secondary",
  verified: "default",
  error: "destructive",
};

export function CustomDomainCard() {
  const { tenant, saveDomain, removeDomain } = useTenant();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(tenant?.custom_domain ?? "");
  }, [tenant?.custom_domain]);

  if (!tenant) return null;

  const status = tenant.custom_domain_status ?? "not_configured";

  const onSave = async () => {
    setBusy(true);
    try {
      await saveDomain(value);
      toast.success("Dominio guardado. La verificación DNS se implementará en la siguiente etapa.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar el dominio");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await removeDomain();
      setValue("");
      toast.success("Dominio eliminado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-display text-lg">Dominio personalizado</CardTitle>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
        <CardDescription>
          Conecta un dominio propio para tus QRs. Ejemplo: qr.tutienda.com
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tenant.custom_domain && (
          <div className="text-sm">
            <span className="text-muted-foreground">Actual: </span>
            <span className="font-medium">{tenant.custom_domain}</span>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="custom-domain">Dominio</Label>
          <Input
            id="custom-domain"
            placeholder="qr.tutienda.com"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">
            Sin "https://" y sin "/" al final.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSave} disabled={busy || !value.trim()}>
            Guardar dominio
          </Button>
          {tenant.custom_domain && (
            <Button variant="outline" onClick={onRemove} disabled={busy}>
              Eliminar dominio
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}