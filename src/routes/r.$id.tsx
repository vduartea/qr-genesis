import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QrCode as QrCodeIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  resolveQrRedirect,
  throwExternalQrRedirect,
} from "@/services/qrRedirect.functions";
import { getDomainContext } from "@/server/requestDomain";

export const Route = createFileRoute("/r/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          // Stage 6: detect incoming host (Host header) — logging only.
          // Does NOT change redirect logic or tenant resolution yet.
          try {
            const { request } = await import("@tanstack/react-start/server").then(
              (m) => ({ request: m.getRequest() }),
            );
            const ctx = getDomainContext(request);
            if (process.env.NODE_ENV !== "production") {
              console.log(
                `[domain] Incoming request from host: ${ctx.host ?? "(unknown)"} (custom=${ctx.isCustomDomain})`,
              );
            }
          } catch {
            // best-effort; never break redirects
          }
          const result = await resolveQrRedirect({ data: { id: params.id } });

          if (result.status === "ok") {
            return new Response(null, {
              status: 302,
              headers: {
                Location: result.destinationUrl,
                // Don't cache — destination may change (dynamic QRs).
                "Cache-Control": "no-store",
              },
            });
          }

          if (result.status === "expired") {
            return new Response(expiredHtml(result.fallbackUrl), {
              status: 410,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
              },
            });
          }

            return new Response(invalidHtml(), {
              status: 404,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        } catch (err) {
          console.error("[r/$id] resolver error", err);
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

    if (result.status === "expired") {
      return { state: "expired" as const, fallbackUrl: result.fallbackUrl };
    }

    if (result.status !== "ok") {
      return { state: "invalid" as const };
    }

    throwExternalQrRedirect(result.destinationUrl);
  },
  component: RedirectStatePage,
  errorComponent: () => <InvalidQrPage />,
  notFoundComponent: () => <InvalidQrPage />,
});

function RedirectStatePage() {
  const data = Route.useLoaderData() as
    | { state: "expired"; fallbackUrl: string | null }
    | { state: "invalid" }
    | undefined;

  if (data?.state === "expired") {
    return <ExpiredQrPage fallbackUrl={data.fallbackUrl} />;
  }

  return <InvalidQrPage />;
}

function invalidHtml(): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>QR no válido</title><style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b10;color:#f5f5f7;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}.card{max-width:420px;text-align:center}.card h1{font-size:24px;margin:16px 0 8px}.card p{color:#a1a1aa;font-size:14px;margin:0 0 24px}.card a{display:inline-block;padding:10px 18px;border-radius:10px;background:#6366f1;color:#fff;text-decoration:none;font-weight:600;font-size:14px}</style></head><body><div class="card"><h1>QR no válido</h1><p>Este código QR no existe, ha sido eliminado o ya no está activo.</p><a href="/">Ir al inicio</a></div></body></html>`;
}

function expiredHtml(fallbackUrl: string | null): string {
  // Server-rendered version (used by the bare-bones GET handler).
  // Includes a 5-second visual countdown + meta refresh fallback for
  // clients that don't run JS (most QR scanners do, but be safe).
  const safeFallback = fallbackUrl ?? "/";
  const escaped = safeFallback
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="5;url=${escaped}"><title>QR expirado</title><style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b10;color:#f5f5f7;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}.card{max-width:440px;text-align:center}.icon{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:24px}.card h1{font-size:24px;margin:20px 0 8px}.card p{color:#a1a1aa;font-size:14px;margin:0 0 8px}.count{margin:24px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:48px;font-weight:600;color:#fff}.card a{display:inline-block;padding:10px 18px;border-radius:10px;background:#6366f1;color:#fff;text-decoration:none;font-weight:600;font-size:14px}</style></head><body><div class="card"><div class="icon">⏱</div><h1>Este código ha expirado</h1><p>Serás redirigido en unos segundos.</p><div class="count" id="c">5</div><a href="${escaped}" id="go">Ir ahora</a></div><script>(function(){var n=5;var el=document.getElementById('c');var t=setInterval(function(){n--;if(el)el.textContent=String(n);if(n<=0){clearInterval(t);location.replace(${JSON.stringify(safeFallback)});}},1000);})();</script></body></html>`;
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

function ExpiredQrPage({ fallbackUrl }: { fallbackUrl: string | null }) {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = fallbackUrl ?? "/";
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          window.location.replace(target);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fallbackUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-soft">
          <Clock className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Este código ha expirado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Serás redirigido en unos segundos.
        </p>
        <div
          aria-live="polite"
          className="my-6 font-display text-5xl font-semibold tabular-nums text-foreground"
        >
          {seconds}
        </div>
        <Button asChild variant="hero">
          <a href={fallbackUrl ?? "/"}>Ir ahora</a>
        </Button>
      </div>
    </main>
  );
}
