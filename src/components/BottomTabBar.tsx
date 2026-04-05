import { useLocation, useNavigate } from "react-router-dom";
import { Leaf, BookOpen, Settings } from "lucide-react";

const tabs = [
  { path: "/", label: "Inicio", icon: Leaf },
  { path: "/mis-plantas", label: "Mis plantas", icon: BookOpen },
  { path: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-foreground/10 h-16">
      <div className="max-w-md mx-auto h-full flex items-center justify-around">
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
