import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode as QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  resolveQrRedirect,
  throwExternalQrRedirect,
} from "@/services/qrRedirect.functions";
import { getDomainContext } from "@/server/requestDomain";
import { resolveTenantByHost } from "@/server/resolveTenant";

export const Route = createFileRoute("/q/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { host } = getDomainContext(request);
        const tenantRes = await resolveTenantByHost(host);

        if (tenantRes.kind === "not_found") {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[q/$id] unknown host: ${tenantRes.host}`);
          }
          return new Response(domainNotConfiguredHtml(), {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[q/$id] resolved kind=${tenantRes.kind} host=${tenantRes.host ?? "(none)"}`,
            tenantRes.kind === "tenant" ? `tenant=${tenantRes.tenant.id}` : "",
          );
        }

        try {
          const tenantId =
            tenantRes.kind === "tenant" ? tenantRes.tenant.id : null;
          const result = await resolveQrRedirect({
            data: {
              id: params.id,
              tenantId,
              host: tenantRes.host ?? null,
            },
          });

          if (result.status === "ok") {
            return new Response(null, {
              status: 302,
              headers: {
                Location: result.destinationUrl,
                "Cache-Control": "no-store",
              },
            });
          }

          if (result.status === "expired") {
            return new Response(null, {
              status: 302,
              headers: {
                Location: result.fallbackUrl ?? "/",
                "Cache-Control": "no-store",
              },
            });
          }

          return new Response(invalidHtml(), {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        } catch (err) {
          console.error("[q/$id] resolver error", err);
          return new Response(invalidHtml(), {
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      },
    },
  },
  loader: async ({ params }) => {
    const result = await resolveQrRedirect({ data: { id: params.id } });
    if (result.status === "ok") throwExternalQrRedirect(result.destinationUrl);
    if (result.status === "expired" && result.fallbackUrl) {
      throwExternalQrRedirect(result.fallbackUrl);
    }
    return { state: "invalid" as const };
  },
  component: InvalidQrPage,
  errorComponent: () => <InvalidQrPage />,
  notFoundComponent: () => <InvalidQrPage />,
});

function invalidHtml(): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>QR no válido</title></head><body style="font-family:system-ui;background:#0b0b10;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center"><div style="text-align:center;max-width:420px;padding:24px"><h1>QR no válido</h1><p style="color:#a1a1aa">Este código QR no existe o ya no está activo.</p></div></body></html>`;
}

function domainNotConfiguredHtml(): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Dominio no configurado</title></head><body style="font-family:system-ui;background:#0b0b10;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center"><div style="text-align:center;max-width:440px;padding:24px"><h1>Dominio no configurado</h1><p style="color:#a1a1aa">Dominio no configurado o no verificado.</p></div></body></html>`;
}

function InvalidQrPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-soft">
          <QrCodeIcon className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          QR no válido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este código QR no existe, ha sido eliminado o ya no está activo.
        </p>
        <div className="mt-6">
          <Button asChild variant="hero">
            <Link to="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}