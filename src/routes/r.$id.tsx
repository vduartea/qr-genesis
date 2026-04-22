import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveAndTrackQr } from "@/server/qrRedirect";

export const Route = createFileRoute("/r/$id")({
  loader: async ({ params }) => {
    console.log("[route] loader running", params.id);

    const destination = await resolveAndTrackQr({
      data: params.id,
    });

    if (!destination) {
      throw new Response(
        "QR no válido: este código QR no existe o no está activo",
        { status: 404 }
      );
    }

    throw redirect({
      href: destination,
    });
  },
});
