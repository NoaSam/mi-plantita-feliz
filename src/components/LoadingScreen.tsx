import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Search, FlowerIcon, Stethoscope, Check } from "lucide-react";

// --- Progress phases ---

const phases = [
  { label: "Analizando la imagen…", icon: Search },
  { label: "Identificando la especie…", icon: Leaf },
  { label: "Consultando cuidados…", icon: FlowerIcon },
  { label: "Preparando el diagnóstico…", icon: Stethoscope },
] as const;

const PHASE_DURATION_MS = 3200;

// --- Botanical curiosities ---

const curiosities = [
  "Las plantas se comunican entre sí a través de sus raíces.",
  "Un roble adulto puede absorber más de 400 litros de agua al día.",
  "Hay más de 400.000 especies de plantas conocidas en la Tierra.",
  "Las plantas pueden reconocer a sus parientes cercanos.",
  "El bambú puede crecer hasta 91 cm en un solo día.",
  "Las raíces de un árbol pueden extenderse el doble que su copa.",
  "Las plantas liberan oxígeno solo durante el día.",
  "El girasol joven sigue al sol de este a oeste cada día.",
  "Algunas semillas pueden germinar después de miles de años.",
  "Las plantas del desierto almacenan agua en sus tallos y hojas.",
  "Los musgos fueron de las primeras plantas terrestres, hace 450 millones de años.",
  "Una sola planta de maíz puede producir 600 granos.",
];

const CURIOSITY_INTERVAL_MS = 4500;

function pickRandom<T>(arr: readonly T[], exclude?: T): T {
  const filtered = exclude != null ? arr.filter((x) => x !== exclude) : [...arr];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// --- Component ---

export default function LoadingScreen() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [curiosity, setCuriosity] = useState(() => pickRandom(curiosities));

  // Advance phases
  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, phases.length - 1));
    }, PHASE_DURATION_MS);
    return () => clearInterval(timer);
  }, []);

  // Rotate curiosities
  useEffect(() => {
    const timer = setInterval(() => {
      setCuriosity((prev) => pickRandom(curiosities, prev));
    }, CURIOSITY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10 px-6">
      {/* Animated leaf */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], rotate: [0, 6, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <Leaf className="size-16 text-primary" strokeWidth={1.5} />
        {/* Subtle pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/20"
          style={{ margin: "-12px" }}
          animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      {/* Progress phases */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {phases.map((phase, i) => {
          const Icon = phase.icon;
          const isDone = i < phaseIndex;
          const isActive = i === phaseIndex;
          const isPending = i > phaseIndex;

          return (
            <motion.div
              key={phase.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              {/* Step indicator */}
              <div
                className={`size-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Check className="size-4" strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <Icon
                    className={`size-4 ${isActive ? "animate-pulse-slow" : ""}`}
                    strokeWidth={1.8}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-base font-body transition-colors duration-500 ${
                  isDone
                    ? "text-primary font-medium"
                    : isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                }`}
              >
                {phase.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Botanical curiosity */}
      <div className="w-full max-w-xs min-h-[4.5rem]">
        <AnimatePresence mode="wait">
          <motion.p
            key={curiosity}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-muted-foreground text-center leading-relaxed italic"
          >
            {curiosity}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
