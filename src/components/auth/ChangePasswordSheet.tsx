import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updatePassword, verifyCurrentPassword } from "@/services/auth.service";
import { track } from "@/lib/track";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Introduce tu contraseña actual"),
    newPassword: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

const inputClassName =
  "w-full py-3 px-4 text-base bg-secondary border-2 border-foreground rounded-2xl font-body placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30";

export interface ChangePasswordSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordSheet({
  open,
  onClose,
}: ChangePasswordSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset();
      setServerError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    if (!user?.email) {
      setServerError("No se pudo verificar tu sesión. Recarga la app.");
      return;
    }
    const reauth = await verifyCurrentPassword(user.email, values.currentPassword);
    if (!reauth.ok) {
      setServerError(reauth.error ?? "Contraseña actual incorrecta");
      return;
    }
    const { error } = await updatePassword(values.newPassword);
    if (error) {
      setServerError(error);
      return;
    }
    track("password_changed", { source: "settings" });
    toast("✓ Contraseña actualizada", { duration: 3000 });
    onClose();
  };

  const handleForgotInSheet = () => {
    onClose();
    navigate("/auth/recuperar");
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="bg-background border-t-2 border-foreground rounded-t-2xl p-6 max-h-[90dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-md sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
      >
        <div
          className="w-9 h-1 bg-foreground/25 rounded-full mx-auto mb-5"
          aria-hidden
        />
        <SheetHeader className="items-start text-left gap-1 p-0 mb-4">
          <SheetTitle className="font-display text-xl font-semibold leading-tight text-foreground">
            Cambiar contraseña
          </SheetTitle>
          <p className="font-body text-sm text-muted-foreground">
            Te pedimos la actual por seguridad.
          </p>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="current-password"
              className="text-sm font-body font-semibold"
            >
              Contraseña actual
            </Label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className={inputClassName}
              placeholder="Tu contraseña actual"
              {...register("currentPassword")}
            />
            <button
              type="button"
              onClick={handleForgotInSheet}
              className="self-start text-xs text-primary underline underline-offset-2 mt-0.5"
            >
              ¿No la recuerdas? Recuperar por email
            </button>
            {errors.currentPassword && (
              <p className="text-xs text-accent" role="alert">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="change-new-password"
              className="text-sm font-body font-semibold"
            >
              Nueva contraseña
            </Label>
            <input
              id="change-new-password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              placeholder="Mínimo 6 caracteres"
              {...register("newPassword")}
            />
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
            {errors.newPassword && (
              <p className="text-xs text-accent" role="alert">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="change-confirm-password"
              className="text-sm font-body font-semibold"
            >
              Confirma la nueva
            </Label>
            <input
              id="change-confirm-password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              placeholder="Repítela"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-accent" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {serverError && (
            <p
              className="p-3 bg-accent/10 border-2 border-accent rounded-xl text-accent text-sm text-center"
              role="alert"
            >
              {serverError}
            </p>
          )}

          <SheetFooter className="flex flex-col gap-2 sm:flex-col p-0 mt-2">
            <Button
              type="submit"
              variant="hero"
              size="default"
              disabled={isSubmitting}
              className="w-full font-display text-base font-bold min-h-11"
            >
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onClose}
              className="w-full font-body text-base font-semibold border-2 border-foreground min-h-11"
            >
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
