import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LegalFooter from "@/components/LegalFooter";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export default function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="size-4 mr-2" />
          Volver
        </Button>

        {/* Title */}
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última actualización: {lastUpdated}
        </p>

        {/* Content */}
        <div className="prose prose-sm max-w-none text-foreground/90 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-6 [&_li]:text-base [&_li]:leading-relaxed [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>

        <LegalFooter />
      </div>
    </div>
  );
}
