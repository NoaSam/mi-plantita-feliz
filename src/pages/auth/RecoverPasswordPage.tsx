import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requestPasswordRecovery } from "@/services/auth.service";

const schema = z.object({
  email: z.string().email("Email no válido"),
});
type FormValues = z.infer<typeof schema>;

const inputClassName =
  "w-full py-4 px-4 text-xl bg-secondary border-2 border-foreground rounded-2xl font-body placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30";

export default function RecoverPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    document.title = "Recuperar contraseña · Mi Plantita Feliz";
  }, []);

  const onSubmit = async ({ email }: FormValues) => {
    await requestPasswordRecovery(email);
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <div className="min-h-screen px-6 py-12 flex flex-col items-center justify-center gap-6 text-center">
        <div
          className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl"
          style={{ boxShadow: "var(--shadow-press)" }}
          aria-hidden
        >
          📬
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Revisa tu email
        </h1>
        <p className="font-body text-base text-muted-foreground max-w-sm">
          Si la cuenta existe, te hemos enviado un enlace para crear una nueva
          contraseña a:
        </p>
        <div className="bg-secondary border-2 border-foreground rounded-2xl px-5 py-3 font-display font-semibold text-foreground break-all">
          {sentTo}
        </div>
        <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 text-sm text-primary max-w-sm">
          El enlace expira en 1 hora.
          <br />
          Si no lo recibes, mira tu carpeta de Spam.
        </div>
        <Button asChild variant="outline" size="lg" className="mt-2 border-2 border-foreground">
          <Link to="/login">Volver al inicio de sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-12 flex flex-col gap-8">
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 -ml-1 py-2 pr-3 pl-1 rounded-lg text-foreground hover:bg-foreground/5 self-start"
        aria-label="Volver al inicio de sesión"
      >
        <ArrowLeft className="size-5" strokeWidth={2} />
        <span className="font-body text-sm font-medium">Volver</span>
      </Link>

      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="size-14 rounded-full bg-primary/10 flex items-center justify-center"
          aria-hidden
        >
          <Mail className="size-7 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          ¿No recuerdas tu contraseña?
        </h1>
        <p className="font-body text-base text-muted-foreground max-w-sm">
          Te enviamos un enlace para crear una nueva. Llega en 1-2 minutos.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recover-email" className="text-lg font-body font-medium">
            Email
          </Label>
          <input
            id="recover-email"
            type="email"
            autoComplete="email"
            className={inputClassName}
            placeholder="tu@email.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-accent" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="hero"
          size="lg"
          disabled={isSubmitting}
          className="w-full font-display text-base font-bold"
        >
          {isSubmitting ? "Enviando…" : "Enviar enlace"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Te acuerdas ya?{" "}
          <Link to="/login" className="text-primary underline underline-offset-2">
            Volver a iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
