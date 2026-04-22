import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode as QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getQrRedirectOrThrow,
  resolveQrRedirect,
  throwExternalQrRedirect,
} from "@/services/qrRedirect.functions";

export const Route = createFileRoute("/r/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const destination = await resolveAndTrack(params.id);
          if (!destination) {
            // Render the invalid page in-place (no redirect loop, no
            // /r/invalid placeholder URL). 404 + HTML body.
            return new Response(invalidHtml(), {
              status: 404,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }
          return new Response(null, {
            status: 302,
            headers: {
              Location: destination,
              // Don't cache — destination may change (dynamic QRs).
              "Cache-Control": "no-store",
            },
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
  // SSR/client backup path: if the route is matched via the React tree
  // (initial SSR render or internal navigation), perform the same lookup
  // and either issue an external redirect or render the invalid UI.
  loader: async ({ params }) => {
    const destination = await resolveAndTrack(params.id);
    if (!destination) {
      // Render the invalid component — do NOT redirect to /r/invalid (that
      // creates a loop because the same route would re-resolve).
      return { invalid: true as const };
    }
    // External URL — use a raw redirect (TanStack's `redirect` helper is
    // for internal routes only).
    throw redirect({ href: destination });
  },
  component: InvalidQrPage,
  errorComponent: () => <InvalidQrPage />,
});

function invalidHtml(): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>QR no válido</title><style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b10;color:#f5f5f7;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}.card{max-width:420px;text-align:center}.card h1{font-size:24px;margin:16px 0 8px}.card p{color:#a1a1aa;font-size:14px;margin:0 0 24px}.card a{display:inline-block;padding:10px 18px;border-radius:10px;background:#6366f1;color:#fff;text-decoration:none;font-weight:600;font-size:14px}</style></head><body><div class="card"><h1>QR no válido</h1><p>Este código QR no existe, ha sido eliminado o ya no está activo.</p><a href="/">Ir al inicio</a></div></body></html>`;
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
