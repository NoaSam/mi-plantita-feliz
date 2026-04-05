import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Check, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlantResult } from "@/hooks/use-plant-identifier";
import ReactMarkdown from "react-markdown";

interface PlantResultViewProps {
  result: PlantResult;
  onReset: () => void;
  onFeedback: (feedback: "correct" | "incorrect" | "unknown") => void;
}

export default function PlantResultView({ result, onReset, onFeedback }: PlantResultViewProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const handleFeedback = (value: "correct" | "incorrect" | "unknown") => {
    onFeedback(value);
    setFeedbackGiven(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-8"
    >
      {/* Photo confirmation */}
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

      {/* Herbarium card style sections */}
      <section className="border-2 border-foreground rounded-2xl p-6 bg-secondary/50" style={{ boxShadow: "var(--shadow-press)" }}>
        <h2 className="font-display text-2xl font-semibold text-foreground mb-3">🌱 Qué es</h2>
        <div className="text-lg leading-relaxed text-foreground/80 prose prose-lg max-w-none">
          <ReactMarkdown>{result.description}</ReactMarkdown>
        </div>
      </section>

      <section className="border-2 border-foreground rounded-2xl p-6 bg-secondary/50" style={{ boxShadow: "var(--shadow-press)" }}>
        <h2 className="font-display text-2xl font-semibold text-foreground mb-3">💧 Cómo cuidarla</h2>
        <div className="text-lg leading-relaxed text-foreground/80 prose prose-lg max-w-none">
          <ReactMarkdown>{result.care}</ReactMarkdown>
        </div>
      </section>

      <section className="border-2 border-foreground rounded-2xl p-6 bg-secondary/50" style={{ boxShadow: "var(--shadow-press)" }}>
        <h2 className="font-display text-2xl font-semibold text-foreground mb-3">🔍 Qué le pasa</h2>
        <div className="text-lg leading-relaxed text-foreground/80 prose prose-lg max-w-none">
          <ReactMarkdown>{result.diagnosis}</ReactMarkdown>
        </div>
      </section>

      {/* Feedback card */}
      <section className="border-2 border-foreground rounded-2xl p-6 bg-secondary/50" style={{ boxShadow: "var(--shadow-press)" }}>
        {feedbackGiven ? (
          <p className="text-lg text-center text-foreground/80">Gracias por tu respuesta!</p>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4 text-center">
              Te ha identificado bien la planta?
            </h2>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleFeedback("correct")}
                className="flex-1 border-2 border-foreground"
              >
                <Check className="!size-5 mr-1" />
                Correcto
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleFeedback("incorrect")}
                className="flex-1 border-2 border-foreground"
              >
                <X className="!size-5 mr-1" />
                Incorrecto
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleFeedback("unknown")}
                className="flex-1 border-2 border-foreground"
              >
                <HelpCircle className="!size-5 mr-1" />
                No lo sé
              </Button>
            </div>
          </>
        )}
      </section>

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
