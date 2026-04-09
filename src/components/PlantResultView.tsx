import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
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

interface PlantResultViewProps {
  result: PlantResult;
  onReset: () => void;
}

const sections = [
  { value: "description", emoji: "\u{1F331}", label: "Qué es" },
  { value: "care", emoji: "\u{1F4A7}", label: "Cómo cuidarla" },
  { value: "diagnosis", emoji: "\u{1F50D}", label: "Qué le pasa" },
] as const;

export default function PlantResultView({ result, onReset }: PlantResultViewProps) {
  const contentMap: Record<string, string> = {
    description: result.description,
    care: result.care,
    diagnosis: result.diagnosis,
  };

  const handleSectionClick = (value: string, label: string) => {
    track("result_section_click", { section: value, section_label: label, plant_name: result.name });
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
          src={result.imageUrl}
          alt={result.name}
          className="w-full h-64 object-cover"
        />
      </div>

      {/* Plant name */}
      <h1 className="font-display text-3xl font-bold text-foreground">
        {result.name}
      </h1>

      {/* Accordion sections */}
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

      {/* Reset button */}
      <Button
        variant="hero"
        size="xl"
        onClick={onReset}
        style={{ boxShadow: "var(--shadow-press)" }}
      >
        <RotateCcw className="!size-8" />
        Volver a empezar
      </Button>
    </motion.div>
  );
}
