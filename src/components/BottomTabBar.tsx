import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Leaf, BookOpen, Settings, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useContextCounts } from "@/hooks/use-context-counts";

interface Tab {
  path: string;
  label: string;
  icon: LucideIcon;
}

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wild_with_coords } = useContextCounts();

  const tabs: Tab[] = useMemo(() => {
    const result: Tab[] = [{ path: "/", label: "Inicio", icon: Leaf }];
    if (user && wild_with_coords >= 1) {
      result.push({ path: "/mapa", label: "Mapa", icon: MapPin });
    }
    result.push({ path: "/mis-plantas", label: "Mis plantas", icon: BookOpen });
    if (user) {
      result.push({ path: "/ajustes", label: "Ajustes", icon: Settings });
    }
    return result;
  }, [user, wild_with_coords]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-foreground/10 pb-safe">
      <div className="max-w-md mx-auto h-16 flex items-center justify-around">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-0.5 py-2 px-4"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`size-6 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span
                className={`text-xs font-body ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
