import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { PlantResult } from "@/hooks/use-plant-identifier";
import ReactMarkdown from "react-markdown";
import { track } from "@/lib/track";
import { useAuth } from "@/hooks/use-auth";
import { useClassifyPlant } from "@/hooks/use-classify-plant";
import { getAnonymousId } from "@/lib/anonymous-id";
import ClassificationCards from "@/components/ClassificationCards";
import ClassificationMorph from "@/components/ClassificationMorph";
import PersistentClassificationBanner from "@/components/PersistentClassificationBanner";
import AnonClassificationWall from "@/components/AnonClassificationWall";

export interface PlantResultViewProps {
  plant: PlantResult;
  onReset?: () => void;
}

const sections = [
  { value: "description", emoji: "\u{1F331}", label: "Qué es" },
  { value: "care", emoji: "\u{1F4A7}", label: "Cómo cuidarla" },
  { value: "diagnosis", emoji: "\u{1F50D}", label: "Qué le pasa" },
] as const;

type Phase = "cards" | "morph" | "banner";

function derivePhase(context: PlantResult["context"]): Phase {
  if (context === "home" || context === "wild") return "banner";
  return "cards";
}

export default function PlantResultView({ plant, onReset }: PlantResultViewProps) {
  const { user } = useAuth();
  const { classify, revert } = useClassifyPlant();

  // State machine: "cards" → "morph" → "banner" or reverse via Cambiar
  const [phase, setPhase] = useState<Phase>(() => derivePhase(plant.context));
  const [pendingAction, setPendingAction] = useState<"home" | "wild" | null>(null);
  const [committedContext, setCommittedContext] = useState<"home" | "wild" | null>(
    plant.context === "home" || plant.context === "wild" ? plant.context : null,
  );
  const [wallOpen, setWallOpen] = useState(false);
  const [intendedAction, setIntendedAction] = useState<"home" | "wild" | null>(null);

  // Resync derived state when plant.id changes (CR-02).
  // React Router reuses a parameterized route's component instance, so the
  // useState lazy initializers don't re-run when navigating between two
  // /planta/:id routes. Without this effect, the previous plant's
  // phase/pendingAction/committedContext would leak into the new render.
  useEffect(() => {
    setPhase(derivePhase(plant.context));
    setPendingAction(null);
    setCommittedContext(
      plant.context === "home" || plant.context === "wild" ? plant.context : null,
    );
    setWallOpen(false);
    setIntendedAction(null);
  }, [plant.id, plant.context]);

  const contentMap: Record<string, string> = {
    description: plant.description,
    care: plant.care,
    diagnosis: plant.diagnosis,
  };

  // Stable callbacks via useCallback so ClassificationMorph's useEffect doesn't
  // restart its 5s undo timer on every parent re-render (the effect's deps
  // include onCommit/onUndo). Without this, the timer never settles → phase
  // never advances to "banner" and the eyebrow stays on "¿Qué hacemos…?".
  const handleClassify = useCallback(
    async (action: "home" | "wild") => {
      if (!user) {
        // Anonymous: open wall, do NOT touch DB
        setIntendedAction(action);
        setWallOpen(true);
        return;
      }
      // Authenticated: optimistic immediate UPDATE
      setPendingAction(action);
      const { ok } = await classify(plant.id, action);
      if (!ok) {
        toast.error("No se pudo guardar. Reintenta.");
        setPendingAction(null);
        return;
      }
      setPhase("morph");
    },
    [user, classify, plant.id],
  );

  const handleUndo = useCallback(async () => {
    if (!pendingAction) return;
    const { ok } = await revert(plant.id);
    if (!ok) {
      // CR-03: the original UPDATE succeeded — DB row is still classified.
      // Promote to committed banner so the UI matches the DB instead of stranding
      // the user in the green pill with no recovery path.
      toast.error("No se pudo deshacer. La planta sigue en tu jardín.");
      setCommittedContext(pendingAction);
      setPendingAction(null);
      setPhase("banner");
      return;
    }
    setPendingAction(null);
    setPhase("cards");
  }, [pendingAction, revert, plant.id]);

  const handleCommit = useCallback(() => {
    if (!pendingAction) return;
    setCommittedContext(pendingAction);
    setPendingAction(null);
    setPhase("banner");
  }, [pendingAction]);

  const handleChange = useCallback(() => {
    // Per D-08, do NOT touch DB here — just re-mount cards. Next tap drives the UPDATE.
    setPhase("cards");
  }, []);

  const handleSectionClick = (value: string, label: string) => {
    track("result_section_click", { section: value, section_label: label, plant_name: plant.name });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-6"
    >
      {/* Photo */}
      <div className="rounded-2xl overflow-hidden border-2 border-foreground">
        <img
          src={plant.imageUrl}
          alt={plant.name}
          className="w-full h-64 object-cover"
        />
      </div>

      {/* Plant name */}
      <h1 className="font-display text-3xl font-bold text-foreground">
        {plant.name}
      </h1>

      {/* Classification section — always labeled, cards/morph/banner inside */}
      <section aria-labelledby="classification-eyebrow" className="flex flex-col gap-4">
        <h2 id="classification-eyebrow" className="font-display text-base text-muted-foreground">
          ¿Qué hacemos con esta planta?
        </h2>
        <AnimatePresence mode="wait">
          {phase === "cards" && (
            <ClassificationCards
              key="cards"
              plantSearchId={plant.id}
              source="result"
              pendingAction={pendingAction}
              onClassify={handleClassify}
            />
          )}
          {phase === "morph" && pendingAction && (
            <ClassificationMorph
              key="morph"
              plantSearchId={plant.id}
              source="result"
              action={pendingAction}
              onUndo={handleUndo}
              onCommit={handleCommit}
            />
          )}
          {phase === "banner" && committedContext && (
            <PersistentClassificationBanner
              key="banner"
              plantSearchId={plant.id}
              context={committedContext}
              onChange={handleChange}
            />
          )}
        </AnimatePresence>
      </section>

      {/* Anon wall — controlled by wallOpen state. Only render when intendedAction is set
          to satisfy AnonClassificationWall's non-null `intendedAction: 'home' | 'wild'` prop. */}
      {intendedAction && (
        <AnonClassificationWall
          open={wallOpen}
          onOpenChange={setWallOpen}
          plantSearchId={plant.id}
          intendedAction={intendedAction}
          anonymousId={getAnonymousId()}
        />
      )}

      {/* Info section — always rendered below the classification section.
          For wild plants (descubrimientos del mapa) only show "Qué es" — the
          user is not going to water or treat a one-off discovery. */}
      <section aria-labelledby="plant-info-eyebrow" className="flex flex-col gap-4">
        <h2 id="plant-info-eyebrow" className="font-display text-base text-muted-foreground">
          Más sobre esta planta
        </h2>
        <Accordion
          type="multiple"
          defaultValue={plant.context === "wild" ? ["description"] : ["diagnosis"]}
          className="flex flex-col gap-4"
        >
        {sections
          .filter(({ value }) => plant.context !== "wild" || value === "description")
          .map(({ value, emoji, label }) => (
          <AccordionItem
            key={value}
            value={value}
            className="border-2 border-foreground rounded-2xl bg-secondary/50 overflow-hidden"
            style={{ boxShadow: "var(--shadow-press)" }}
          >
            <AccordionTrigger
              className="px-6 py-4 hover:no-underline"
              onClick={() => handleSectionClick(value, label)}
            >
              <span className="font-display text-xl font-semibold text-foreground">
                {emoji} {label}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-5">
              <div className="text-lg leading-relaxed text-foreground/80 prose prose-lg max-w-none">
                <ReactMarkdown>{contentMap[value]}</ReactMarkdown>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        </Accordion>
      </section>

      {/* Reset button — only when onReset is provided (post-identification flow) */}
      {onReset && (
        <Button
          variant="hero"
          size="xl"
          onClick={onReset}
          style={{ boxShadow: "var(--shadow-press)" }}
        >
          <RotateCcw className="!size-8" />
          Volver a empezar
        </Button>
      )}
    </motion.div>
  );
}
