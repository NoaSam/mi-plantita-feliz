import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updatePassword } from "@/services/auth.service";
import { track } from "@/lib/track";

const schema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

const inputClassName =
  "w-full py-4 px-4 text-xl bg-secondary border-2 border-foreground rounded-2xl font-body placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    document.title = "Nueva contraseña · Mi Plantita Feliz";
  }, []);

  const onSubmit = async ({ password }: FormValues) => {
    setServerError(null);
    const { error } = await updatePassword(password);
    if (error) {
      setServerError(error);
      return;
    }
    track("password_recovery_completed");
    navigate("/", { replace: true });
  };

  // If the recovery token was missing/expired, Supabase wouldn't establish
  // a session and `user` stays null. Show a recovery-specific error.
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen px-6 py-12 flex flex-col items-center justify-center gap-6 text-center">
        <div
          className="size-16 rounded-full bg-accent/10 flex items-center justify-center text-3xl"
          aria-hidden
        >
          ⏰
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Enlace expirado
        </h1>
        <p className="font-body text-base text-muted-foreground max-w-sm">
          El enlace ha caducado o ya se usó. Pide uno nuevo y vuelve a
          intentarlo.
        </p>
        <Button asChild variant="hero" size="lg" className="font-display font-bold">
          <Link to="/auth/recuperar">Pedir un enlace nuevo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-12 flex flex-col gap-8">
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="size-14 rounded-full bg-primary/10 flex items-center justify-center"
          aria-hidden
        >
          <Lock className="size-7 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Crea tu nueva contraseña
        </h1>
        <p className="font-body text-base text-muted-foreground max-w-sm">
          Mínimo 6 caracteres.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password" className="text-lg font-body font-medium">
            Nueva contraseña
          </Label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            placeholder="Mínimo 6 caracteres"
            {...register("password")}
          />
          <p className="text-xs text-muted-foreground">
            Te recomendamos algo fácil de recordar pero difícil de adivinar.
          </p>
          {errors.password && (
            <p className="text-sm text-accent" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="confirm-password"
            className="text-lg font-body font-medium"
          >
            Confirma la contraseña
          </Label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            placeholder="Repítela"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-accent" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        {serverError && (
          <p className="p-4 bg-accent/10 border-2 border-accent rounded-2xl text-accent text-base text-center" role="alert">
            {serverError}
          </p>
        )}
        <Button
          type="submit"
          variant="hero"
          size="lg"
          disabled={isSubmitting}
          className="w-full font-display text-base font-bold"
        >
          {isSubmitting ? "Guardando…" : "Guardar y entrar"}
        </Button>
      </form>
    </div>
  );
}
