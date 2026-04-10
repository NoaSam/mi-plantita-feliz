import type { ReactNode } from "react";
import { Leaf } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import AuthForms from "@/components/auth/AuthForms";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Leaf className="size-12 text-primary animate-pulse-slow" strokeWidth={1.2} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-6 py-8">
        <AuthForms />
      </div>
    );
  }

  return <>{children}</>;
}
