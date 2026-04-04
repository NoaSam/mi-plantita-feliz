import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/LoginPage";
import { Leaf } from "lucide-react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Leaf className="size-12 text-primary animate-pulse-slow" strokeWidth={1.2} />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <>{children}</>;
}
