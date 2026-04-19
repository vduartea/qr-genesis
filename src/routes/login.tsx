import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Quark" },
      { name: "description", content: "Accede a tu cuenta de Quark." },
      { property: "og:title", content: "Entrar — Quark" },
      { property: "og:description", content: "Accede a tu cuenta de Quark." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <SiteLayout>
      <PageContainer size="sm">
        <Card className="border-border/60 shadow-elegant">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="font-display text-2xl">Bienvenido de vuelta</CardTitle>
            <CardDescription>
              Ingresa a tu cuenta para gestionar tus códigos QR
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="tu@email.com" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="••••••••" disabled />
              </div>
              <Button type="submit" className="w-full" variant="hero" size="lg" disabled>
                Entrar
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              Próximamente — autenticación en la siguiente etapa.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link to="/register" className="font-medium text-foreground hover:underline">
                Crear cuenta
              </Link>
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    </SiteLayout>
  );
}
