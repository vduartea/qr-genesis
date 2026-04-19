import { Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
            <QrCode className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold">Quark</span>
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()}
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/" className="transition-smooth hover:text-foreground">Inicio</Link>
          <Link to="/login" className="transition-smooth hover:text-foreground">Entrar</Link>
          <Link to="/register" className="transition-smooth hover:text-foreground">Crear cuenta</Link>
        </nav>
      </div>
    </footer>
  );
}
