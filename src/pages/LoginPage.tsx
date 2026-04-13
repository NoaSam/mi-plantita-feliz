import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle, Leaf, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import * as authService from "@/services/auth.service";

// --- Shared styles ---

const inputClassName =
  "w-full py-4 px-4 text-xl bg-secondary border-2 border-foreground rounded-2xl font-body placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30";

function ServerError({ message }: { message: string }) {
  return (
    <div className="p-4 bg-accent/10 border-2 border-accent rounded-2xl text-accent text-lg text-center">
      {message}
    </div>
  );
}

// --- Schemas ---

const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type LoginValues = z.infer<typeof loginSchema>;

const registerSchema = z
  .object({
    email: z.string().email("Email no válido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "Debes aceptar la política de privacidad y los términos" }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type RegisterValues = z.infer<typeof registerSchema>;

// --- Login Form ---

function LoginForm() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async ({ email, password }: LoginValues) => {
    setServerError(null);
    const { error } = await authService.signIn(email, password);
    if (error) {
      setServerError(error);
    } else {
      navigate("/mis-plantas");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email" className="text-lg font-body font-medium">
          Email
        </Label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={inputClassName}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-accent text-base">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="login-password"
          className="text-lg font-body font-medium"
        >
          Contraseña
        </Label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••"
          className={inputClassName}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-accent text-base">{errors.password.message}</p>
        )}
      </div>

      {serverError && <ServerError message={serverError} />}

      <Button
        type="submit"
        variant="hero"
        size="xl"
        disabled={isSubmitting}
        style={{ boxShadow: "var(--shadow-press)" }}
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

// --- Register Form ---

function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const acceptedTerms = watch("acceptedTerms");

  const onSubmit = async ({ email, password }: RegisterValues) => {
    setServerError(null);
    const { error } = await authService.signUp(email, password);
    if (error) {
      setServerError(error);
    } else {
      setSubmittedEmail(email);
    }
  };

  if (submittedEmail) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 py-8"
      >
        <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="size-10 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-center">
          Revisa tu email
        </h2>
        <p className="text-lg text-muted-foreground text-center leading-relaxed">
          Hemos enviado un enlace de confirmación a{" "}
          <strong className="text-foreground">{submittedEmail}</strong>.
          Haz clic en el enlace para activar tu cuenta.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="register-email"
          className="text-lg font-body font-medium"
        >
          Email
        </Label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={inputClassName}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-accent text-base">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="register-password"
          className="text-lg font-body font-medium"
        >
          Contraseña
        </Label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          className={inputClassName}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-accent text-base">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="register-confirm"
          className="text-lg font-body font-medium"
        >
          Repetir contraseña
        </Label>
        <input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          className={inputClassName}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-accent text-base">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Terms acceptance checkbox */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="register-terms"
          checked={acceptedTerms === true}
          onCheckedChange={(checked) =>
            setValue("acceptedTerms", checked === true ? true : false as never, {
              shouldValidate: true,
            })
          }
          className="mt-1 size-5 shrink-0 border-2 border-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <Label
          htmlFor="register-terms"
          className="text-base font-body font-normal leading-relaxed cursor-pointer"
        >
          He leído y acepto la{" "}
          <Link
            to="/privacidad"
            className="text-primary underline underline-offset-2"
            target="_blank"
          >
            política de privacidad
          </Link>{" "}
          y los{" "}
          <Link
            to="/terminos"
            className="text-primary underline underline-offset-2"
            target="_blank"
          >
            términos y condiciones
          </Link>
        </Label>
      </div>
      {errors.acceptedTerms && (
        <p className="text-accent text-base -mt-3">
          {errors.acceptedTerms.message}
        </p>
      )}

      {serverError && <ServerError message={serverError} />}

      <Button
        type="submit"
        variant="hero"
        size="xl"
        disabled={isSubmitting}
        style={{ boxShadow: "var(--shadow-press)" }}
      >
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}

// --- Login Page ---

export default function LoginPage() {
  const navigate = useNavigate();
  const { emailVerified, clearEmailVerified } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-8"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-4 pt-8">
            <Leaf className="size-16 text-primary" strokeWidth={1.2} />
            <h1 className="font-display text-3xl font-bold text-foreground text-center">
              Mi jardín
            </h1>
            <p className="text-lg text-muted-foreground text-center">
              {emailVerified
                ? "Tu cuenta ha sido verificada"
                : "Inicia sesión para guardar tus plantas"}
            </p>
          </div>

          {/* Verification success banner */}
          {emailVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 bg-primary/10 border-2 border-primary/30 rounded-2xl"
            >
              <CheckCircle className="size-6 text-primary shrink-0" />
              <p className="text-lg text-foreground">
                Cuenta verificada correctamente. Ya puedes entrar.
              </p>
              <button
                type="button"
                onClick={clearEmailVerified}
                className="text-muted-foreground text-sm ml-auto shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </motion.div>
          )}

          {/* Auth tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full h-14 rounded-2xl bg-secondary border-2 border-foreground/10 p-1">
              <TabsTrigger
                value="login"
                className="flex-1 h-full rounded-xl text-lg font-body font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="flex-1 h-full rounded-xl text-lg font-body font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Crear cuenta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-8">
              <LoginForm />
            </TabsContent>

            <TabsContent value="register" className="mt-8">
              <RegisterForm />
            </TabsContent>
          </Tabs>

          {/* Back to home */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-muted-foreground text-lg text-center underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Volver al inicio
          </button>
        </motion.div>
      </div>
    </div>
  );
}
