import { useState } from "react";
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

  const contentMap: Record<string, string> = {
    description: plant.description,
    care: plant.care,
    diagnosis: plant.diagnosis,
  };

  // Eyebrow + sub-render derived from the SAME phase in one expression (FLAG #5 resolved):
  const showsCardsOrMorph = phase === "cards" || phase === "morph";
  const eyebrow = showsCardsOrMorph
    ? "¿Qué hacemos con esta planta?"
    : "Más sobre esta planta";

  const handleClassify = async (action: "home" | "wild") => {
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
  };

  const handleUndo = async () => {
    if (!pendingAction) return;
    const { ok } = await revert(plant.id);
    if (!ok) {
      toast.error("No se pudo guardar. Reintenta.");
      return;
    }
    setPendingAction(null);
    setPhase("cards");
  };

  const handleCommit = () => {
    if (!pendingAction) return;
    setCommittedContext(pendingAction);
    setPendingAction(null);
    setPhase("banner");
  };

  const handleChange = () => {
    // Per D-08, do NOT touch DB here — just re-mount cards. Next tap drives the UPDATE.
    setPhase("cards");
  };

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

      {/* Classification section — eyebrow + body atomic per phase */}
      <section aria-labelledby="classification-eyebrow" className="flex flex-col gap-4">
        <p id="classification-eyebrow" className="font-display text-base text-muted-foreground">
          {eyebrow}
        </p>
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

      {/* Accordion sections — UNCHANGED, renders always */}
      <Accordion
        type="multiple"
        defaultValue={["diagnosis"]}
        className="flex flex-col gap-4"
      >
        {sections.map(({ value, emoji, label }) => (
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
