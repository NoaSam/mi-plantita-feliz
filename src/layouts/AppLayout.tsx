import type { ReactNode } from "react";
import BottomTabBar from "@/components/BottomTabBar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto pb-20">
        {children}
      </div>
      <BottomTabBar />
    </div>
  );
}
