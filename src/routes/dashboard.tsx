import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { QrCode, Plus, Folder, BarChart3, Settings } from "lucide-react";
import { useEffect } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQrs } from "@/hooks/useQrs";
import { useTenant } from "@/hooks/useTenant";
import { Badge } from "@/components/ui/badge";
import { QrList } from "@/components/qr/QrList";
import { CustomDomainCard } from "@/components/tenant/CustomDomainCard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Quark" },
      { name: "description", content: "Tu panel para gestionar códigos QR." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { qrs, loading: qrsLoading } = useQrs();
  const { tenant } = useTenant();

  const totalScans = qrs.reduce((sum, q) => sum + (q.scan_count ?? 0), 0);
  const stats = [
    {
      label: "QRs creados",
      value: qrsLoading ? "…" : String(qrs.length),
      icon: QrCode,
    },
    { label: "Colecciones", value: "—", icon: Folder },
    {
      label: "Escaneos totales",
      value: qrsLoading ? "…" : String(totalScans),
      icon: BarChart3,
    },
  ];

  // Client-side guard: dashboard is private.
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: "/dashboard" } });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <SiteLayout>
        <PageContainer>
          <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
            Cargando...
          </div>
        </PageContainer>
      </SiteLayout>
    );
  }

  const displayName = user.email?.split("@")[0] ?? "usuario";

  return (
    <SiteLayout>
      <PageContainer>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Hola, {displayName} 👋
            </h1>
            <p className="mt-2 text-muted-foreground">
              Tu espacio para crear y organizar códigos QR.
            </p>
            {tenant && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface px-3 py-1 text-xs">
                <span className="text-muted-foreground">Tienda:</span>
                <span className="font-medium text-foreground">{tenant.name}</span>
                <span className="text-muted-foreground">/{tenant.slug}</span>
              </div>
            )}
          </div>
          <Button asChild variant="hero" size="lg">
            <Link to="/create">
              <Plus className="h-4 w-4" />
              Nuevo QR
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/60 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-semibold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface px-4 py-3">
          <Badge variant="secondary">Etapa 6</Badge>
          <span className="text-sm text-muted-foreground">
            Tus QRs guardados, listos para descargar o eliminar
          </span>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Mis QRs</h2>
          </div>
          <QrList />
        </section>

        <section className="mt-10">
          <CustomDomainCard />
        </section>

        <Card className="mt-8 border-dashed border-border bg-surface shadow-none">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent shadow-soft">
              <Settings className="h-5 w-5 text-accent-foreground" />
            </div>
            <CardTitle className="font-display text-lg">Configuración</CardTitle>
            <CardDescription>
              Tu cuenta: <span className="font-medium text-foreground">{user.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled>
              Próximamente
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    </SiteLayout>
  );
}
