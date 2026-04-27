import type { ReactNode } from "react";
import BottomTabBar from "@/components/BottomTabBar";
import LegalFooter from "@/components/LegalFooter";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto pb-20 mb-safe">
        {children}
        <LegalFooter />
      </div>
      <BottomTabBar />
    </div>
  );
}
