import type { ReactNode } from "react";
import BottomTabBar from "@/components/BottomTabBar";
import LegalFooter from "@/components/LegalFooter";

interface AppLayoutProps {
  children: ReactNode;
  /**
   * Phase 03.1: when true, omit the `max-w-md mx-auto pb-20 mb-safe`
   * wrapper and LegalFooter so the child can render full-bleed (e.g.
   * /mapa, where the OSM attribution is the legal footer for that surface).
   * Defaults to false — existing pages render unchanged.
   */
  fullBleed?: boolean;
}

export default function AppLayout({ children, fullBleed = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {fullBleed ? (
        children
      ) : (
        <div className="max-w-md mx-auto pb-20 mb-safe">
          {children}
          <LegalFooter />
        </div>
      )}
      <BottomTabBar />
    </div>
  );
}
