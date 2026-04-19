import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AuthGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "save" | "download" | null;
  redirectTo: string;
}

export function AuthGateDialog({ open, onOpenChange, action, redirectTo }: AuthGateDialogProps) {
  const verb = action === "download" ? "descargar" : "guardar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
            <Lock className="h-5 w-5 text-primary-foreground" />
          </div>
          <DialogTitle className="font-display text-xl">
            Crea una cuenta para {verb} tu QR
          </DialogTitle>
          <DialogDescription className="max-w-sm">
            Tu QR está listo. Solo necesitas una cuenta gratuita para {verb}lo y mantenerlo
            siempre disponible.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="hero" className="flex-1">
            <Link to="/register" search={{ redirect: redirectTo }}>
              Registrarme
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/login" search={{ redirect: redirectTo }}>
              Iniciar sesión
            </Link>
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          No perderás tu progreso — lo retomamos donde lo dejaste.
        </p>
      </DialogContent>
    </Dialog>
  );
}
