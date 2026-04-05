import { useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="px-6 py-8 flex flex-col gap-8">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Ajustes
      </h1>

      {/* Account */}
      <div className="flex flex-col gap-4 p-5 bg-secondary/50 border-2 border-foreground/10 rounded-2xl">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Cuenta
        </h2>
        {user ? (
          <>
            <p className="text-base text-muted-foreground break-all">
              {user.email}
            </p>
            <Button variant="outline" size="lg" onClick={signOut}>
              Cerrar sesión
            </Button>
          </>
        ) : (
          <>
            <p className="text-base text-muted-foreground">
              No has iniciado sesión
            </p>
            <Button variant="hero" size="lg" onClick={() => navigate("/login")}>
              Iniciar sesión
            </Button>
          </>
        )}
      </div>

      {/* App info */}
      <div className="flex flex-col items-center gap-3 pt-4 text-muted-foreground">
        <Leaf className="size-8 text-primary/40" strokeWidth={1.2} />
        <p className="font-display text-base font-semibold">Mi jardín</p>
      </div>
    </div>
  );
}
