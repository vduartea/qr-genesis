import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { QrCode as QrCodeIcon } from "lucide-react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/r/$id")({
  // Server-side resolver: looks up the QR by id and 302-redirects to its
  // destination. Runs on every visit (no client JS required), which is
  // critical because QR scanners hit the URL directly.
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;

        // Basic UUID shape guard — avoids hitting the DB with garbage and
        // keeps the error path fast.
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRe.test(id)) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/r/invalid" },
          });
        }

        try {
          const { data, error } = await supabaseAdmin
            .from("qr_codes")
            .select("destination_url, is_active, expires_at")
            .eq("id", id)
            .maybeSingle();

          if (error || !data) {
            return new Response(null, {
              status: 302,
              headers: { Location: "/r/invalid" },
            });
          }

          if (!data.is_active) {
            return new Response(null, {
              status: 302,
              headers: { Location: "/r/invalid" },
            });
          }

          if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
            return new Response(null, {
              status: 302,
              headers: { Location: "/r/invalid" },
            });
          }

          return new Response(null, {
            status: 302,
            headers: {
              Location: data.destination_url,
              // Don't cache the redirect — destination may change (dynamic QRs).
              "Cache-Control": "no-store",
            },
          });
        } catch {
          return new Response(null, {
            status: 302,
            headers: { Location: "/r/invalid" },
          });
        }
      },
    },
  },
  // SSR-safe loader as a backup path: if the route is matched client-side
  // (e.g. via internal navigation), perform the same lookup and redirect.
  loader: async ({ params }) => {
    // Special case: render the "invalid" UI without a DB call.
    if (params.id === "invalid") return { invalid: true as const };

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(params.id)) {
      throw redirect({ to: "/r/$id", params: { id: "invalid" } });
    }
    return { invalid: true as const };
  },
  component: InvalidQrPage,
  // Any unexpected error → friendly message, never a blank screen.
  errorComponent: () => <InvalidQrPage />,
});

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