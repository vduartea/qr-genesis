import { Link, useNavigate } from "@tanstack/react-router";
import { QrCode, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function Navbar() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 transition-smooth hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-soft">
            <QrCode className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Quark</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground data-[status=active]:text-foreground"
          >
            Inicio
          </Link>
          <Link
            to="/create"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground data-[status=active]:text-foreground"
          >
            Crear QR
          </Link>
          {user && (
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground data-[status=active]:text-foreground"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <span className="hidden text-sm text-muted-foreground md:inline">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Salir
              </Button>
            </>
          ) : !loading ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login" search={{ redirect: undefined }}>Entrar</Link>
              </Button>
              <Button asChild size="sm" variant="hero">
                <Link to="/register" search={{ redirect: undefined }}>Crear cuenta</Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
