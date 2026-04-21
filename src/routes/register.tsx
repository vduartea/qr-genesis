import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";

const registerSchema = z
  .object({
    email: z.string().trim().email("Email inválido").max(255),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterInput = z.infer<typeof registerSchema>;

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Crear cuenta — Quark" },
      { name: "description", content: "Crea tu cuenta de Quark y empieza a gestionar tus QRs." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterInput) => {
    setSubmitting(true);
    const { error } = await signUp(values.email, values.password);
    if (error) {
      setSubmitting(false);
      toast.error(error.message || "No se pudo crear la cuenta");
      return;
    }
    // Auto-confirm enabled → log in immediately
    const { error: signInError } = await signIn(values.email, values.password);
    setSubmitting(false);
    if (signInError) {
      toast.success("Cuenta creada. Inicia sesión.");
      navigate({ to: "/login", search: { redirect: undefined } });
      return;
    }
    toast.success("¡Cuenta creada!");
    const target = search.redirect || "/dashboard";
    if (target.startsWith("/")) {
      window.location.href = target;
    } else {
      navigate({ to: "/dashboard" });
    }
  };

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
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="tu@email.com" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" variant="hero" size="lg" disabled={submitting}>
                  {submitting ? "Creando..." : "Crear cuenta"}
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                search={{ redirect: search.redirect }}
                className="font-medium text-foreground hover:underline"
              >
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    </SiteLayout>
  );
}
