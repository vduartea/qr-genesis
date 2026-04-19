import { createFileRoute } from "@tanstack/react-router";
import { QrCode, Plus, Folder, BarChart3 } from "lucide-react";
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

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Quark" },
      { name: "description", content: "Tu panel para gestionar códigos QR." },
      { property: "og:title", content: "Dashboard — Quark" },
      { property: "og:description", content: "Tu panel para gestionar códigos QR." },
    ],
  }),
  component: DashboardPage,
});

const stats = [
  { label: "QRs creados", value: "—", icon: QrCode },
  { label: "Colecciones", value: "—", icon: Folder },
  { label: "Escaneos totales", value: "—", icon: BarChart3 },
];

function DashboardPage() {
  return (
    <SiteLayout>
      <PageContainer>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Tu espacio para crear y organizar códigos QR.
            </p>
          </div>
          <Button variant="hero" size="lg" disabled>
            <Plus className="h-4 w-4" />
            Nuevo QR
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

        <Card className="mt-8 border-dashed border-border bg-surface shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
              <QrCode className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-xl">Aún no hay códigos QR</CardTitle>
            <CardDescription className="mx-auto max-w-md">
              Esta es la base de tu dashboard. Próximamente podrás crear, organizar y
              evolucionar tus QRs desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-10">
            <Button variant="outline" disabled>
              Próximamente
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    </SiteLayout>
  );
}
