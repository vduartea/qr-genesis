import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, QrCode, Sparkles, Layers, BarChart3 } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quark — Crea y gestiona códigos QR desde un solo lugar" },
      {
        name: "description",
        content:
          "Plataforma SaaS moderna para generar, organizar y evolucionar tus códigos QR. Centraliza, mide y escala.",
      },
      { property: "og:title", content: "Quark — Gestión moderna de códigos QR" },
      {
        property: "og:description",
        content:
          "Una plataforma moderna para generar, organizar y evolucionar tus QRs.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: QrCode,
    title: "Generación instantánea",
    description: "Crea códigos QR en segundos con una experiencia limpia y sin fricción.",
  },
  {
    icon: Layers,
    title: "Organización clara",
    description: "Agrupa, etiqueta y encuentra tus QRs sin perderte entre archivos sueltos.",
  },
  {
    icon: BarChart3,
    title: "Listo para escalar",
    description: "Pensado desde el inicio para crecer contigo: estadísticas, equipos y más.",
  },
];

function LandingPage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-32 md:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-elevated px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Nueva forma de gestionar tus QRs
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              Crea y gestiona <span className="text-gradient">códigos QR</span> desde un solo
              lugar
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Una plataforma moderna para generar, organizar y evolucionar tus QRs.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="hero">
                <Link to="/register">
                  Comenzar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/login">Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>

          {/* Decorative QR card */}
          <div className="relative mx-auto mt-20 max-w-3xl">
            <div className="rounded-3xl border border-border/60 bg-surface-elevated p-2 shadow-elegant">
              <div className="rounded-2xl bg-gradient-primary p-10 md:p-16">
                <div className="grid grid-cols-12 gap-2 mx-auto aspect-square max-w-xs">
                  {Array.from({ length: 144 }).map((_, i) => {
                    const filled = (i * 7 + (i % 5) + Math.floor(i / 9)) % 3 !== 0;
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-sm ${
                          filled ? "bg-primary-foreground" : "bg-primary-foreground/10"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Todo lo que necesitas, nada de lo que sobra
            </h2>
            <p className="mt-4 text-muted-foreground">
              Una base sólida para crear, gestionar y hacer crecer tus QRs.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground shadow-soft">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <div className="overflow-hidden rounded-3xl bg-gradient-primary p-10 text-center shadow-elegant md:p-16">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-primary-foreground md:text-4xl">
              Empieza a construir tu sistema de QRs hoy
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Crea tu cuenta y comienza a organizar tus códigos en minutos.
            </p>
            <div className="mt-8">
              <Button asChild size="xl" variant="secondary">
                <Link to="/register">
                  Comenzar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
