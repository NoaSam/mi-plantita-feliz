import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <Leaf className="size-20 text-primary" strokeWidth={1.5} />
      </motion.div>
      <h2 className="font-display text-2xl text-foreground text-center">
        Estamos identificando tu planta...
      </h2>
      <p className="text-lg text-muted-foreground text-center">
        Esto puede tardar unos segundos
      </p>
    </div>
  );
}
