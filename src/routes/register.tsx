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

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Crear cuenta — Quark" },
      { name: "description", content: "Crea tu cuenta de Quark y empieza a gestionar tus QRs." },
      { property: "og:title", content: "Crear cuenta — Quark" },
      {
        property: "og:description",
        content: "Crea tu cuenta de Quark y empieza a gestionar tus QRs.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <SiteLayout>
      <PageContainer size="sm">
        <Card className="border-border/60 shadow-elegant">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="font-display text-2xl">Crea tu cuenta</CardTitle>
            <CardDescription>
              Empieza a generar y gestionar tus códigos QR
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" placeholder="Tu nombre" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="tu@email.com" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="••••••••" disabled />
              </div>
              <Button type="submit" className="w-full" variant="hero" size="lg" disabled>
                Crear cuenta
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              Próximamente — registro en la siguiente etapa.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="font-medium text-foreground hover:underline">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    </SiteLayout>
  );
}
