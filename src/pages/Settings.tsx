import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  FileText,
  Leaf,
  Trash2,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 bg-secondary/50 border-2 border-foreground/10 rounded-2xl">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" strokeWidth={1.5} />
        <h2 className="font-display text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Data export ---

  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("plant_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exportPayload = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        email: user.email,
        plants: data,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mi-jardin-datos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      track("data_exported");
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // --- Account deletion ---

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      // Delete all plant searches
      const { error } = await supabase
        .from("plant_searches")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      track("account_deleted");

      // Sign out (auth.users record cannot be deleted from client-side —
      // requires a service_role edge function for full deletion)
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Account deletion failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Ajustes
      </h1>

      {/* Account */}
      <Section title="Cuenta" icon={Leaf}>
        {user ? (
          <>
            <p className="text-base text-muted-foreground break-all">
              {user.email}
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              Cerrar sesión
            </Button>
          </>
        ) : (
          <>
            <p className="text-base text-muted-foreground">
              No has iniciado sesión
            </p>
            <Button
              variant="hero"
              size="lg"
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </Button>
          </>
        )}
      </Section>

      {/* User data rights — only shown when logged in */}
      {user && (
        <Section title="Tus datos" icon={FileText}>
          <p className="text-base text-muted-foreground">
            Puedes descargar todos tus datos o eliminar tu cuenta en cualquier
            momento. Estos son tus derechos según el RGPD.
          </p>

          {/* Export */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full justify-start gap-2"
          >
            <Download className="size-5" />
            {isExporting ? "Exportando..." : "Descargar mis datos"}
          </Button>

          {/* Delete account */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <UserX className="size-5" />
                Eliminar mi cuenta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl max-w-[calc(100vw-3rem)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-xl text-center">
                  ¿Eliminar tu cuenta?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base text-center">
                  Se borrarán todas tus plantas y datos guardados. Esta acción
                  no se puede deshacer. Si necesitas la eliminación completa de
                  tu cuenta de autenticación, contacta con nosotros por email.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col gap-3 pt-2 sm:flex-col">
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="size-4 mr-2" />
                  {isDeleting ? "Eliminando..." : "Sí, eliminar mi cuenta"}
                </AlertDialogAction>
                <AlertDialogCancel className="w-full mt-0">
                  Cancelar
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Section>
      )}

      {/* App info */}
      <div className="flex flex-col items-center gap-3 pt-4 text-muted-foreground">
        <Leaf className="size-8 text-primary/40" strokeWidth={1.2} />
        <p className="font-display text-base font-semibold">Mi jardín</p>
      </div>
    </div>
  );
}
