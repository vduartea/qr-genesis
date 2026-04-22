import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveAndTrackQr } from "@/server/qrRedirect.server";

export const Route = createFileRoute("/r/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const destination = await resolveAndTrackQr(params.id);

        if (!destination) {
          return new Response(
            "QR no válido: este código QR no existe o no está activo",
            { status: 404 }
          );
        }

        return Response.redirect(destination, 302);
      },
    },
  },
});
