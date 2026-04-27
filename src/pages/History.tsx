import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Search, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlantHistory } from "@/hooks/use-plant-history";
import { track } from "@/lib/track";
import RequireAuth from "@/components/auth/RequireAuth";
import type { PlantResult } from "@/hooks/use-plant-identifier";

const MONTHS = [
  "Todos", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Extract a short health summary from the first line of diagnosis markdown. */
function getHealthPreview(diagnosis: string): string {
  const firstLine = diagnosis.replace(/^#+\s*/, "").split("\n")[0].trim();
  if (!firstLine) return "Sin diagnóstico";
  return firstLine.length > 60 ? firstLine.slice(0, 57) + "..." : firstLine;
}

export default function HistoryPage() {
  const { history, isLoading, deletePlants } = usePlantHistory();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    return history.filter((item: PlantResult) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchesMonth = monthFilter === 0 || new Date(item.date).getMonth() + 1 === monthFilter;
      return matchesSearch && matchesMonth;
    });
  }, [history, search, monthFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExitEdit = () => {
    setEditMode(false);
    setSelected(new Set());
  };

  const handleDelete = async () => {
    const ids = Array.from(selected);
    track("plants_deleted", { count: ids.length });
    await deletePlants(ids);
    setConfirmOpen(false);
    handleExitEdit();
  };

  return (
    <RequireAuth>
      <div className="px-6 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Mis Plantas
          </h1>
          {history.length > 0 && (
            <button
              type="button"
              onClick={editMode ? handleExitEdit : () => setEditMode(true)}
              className="font-body text-lg text-primary font-semibold"
            >
              {editMode ? "Listo" : "Editar"}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-6 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar planta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-4 pl-14 pr-4 text-xl bg-secondary border-2 border-foreground rounded-2xl font-body placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
          />
        </div>

        {/* Month filter */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="w-full py-4 px-4 text-xl bg-secondary border-2 border-foreground rounded-2xl font-body mb-8 focus:outline-none focus:ring-4 focus:ring-primary/30"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Leaf className="size-10 text-primary animate-pulse-slow" strokeWidth={1.2} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-xl text-muted-foreground py-12">
            No hay plantas guardadas
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item: PlantResult) => (
              <motion.div
                key={item.id}
                layout
                className="border-2 border-foreground rounded-2xl overflow-hidden bg-secondary/50"
                style={{ boxShadow: "var(--shadow-press)" }}
              >
                {/* Card row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer active:bg-secondary/80 transition-colors"
                  onClick={() => {
                    if (editMode) {
                      toggleSelect(item.id);
                    } else {
                      setExpanded(expanded === item.id ? null : item.id);
                    }
                  }}
                >
                  {/* Checkbox in edit mode */}
                  {editMode && (
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="size-6 shrink-0 border-2 border-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  )}

                  {/* Photo */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="size-20 rounded-xl object-cover border-2 border-foreground shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-base text-muted-foreground truncate">
                      {getHealthPreview(item.diagnosis)}
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      {new Date(item.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Expanded detail */}
                {!editMode && expanded === item.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t-2 border-foreground p-4 space-y-4"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full rounded-xl border-2 border-foreground"
                    />
                    <div>
                      <h3 className="font-display text-lg font-semibold mb-1">🌱 Qué es</h3>
                      <div className="prose prose-sm max-w-none"><ReactMarkdown>{item.description}</ReactMarkdown></div>
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold mb-1">💧 Cuidados</h3>
                      <div className="prose prose-sm max-w-none"><ReactMarkdown>{item.care}</ReactMarkdown></div>
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold mb-1">🔍 Diagnóstico</h3>
                      <div className="prose prose-sm max-w-none"><ReactMarkdown>{item.diagnosis}</ReactMarkdown></div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Sticky delete bar */}
        <AnimatePresence>
          {editMode && selected.size > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-0 right-0 px-6 pb-4 mb-safe z-40"
            >
              <Button
                variant="destructive"
                size="lg"
                onClick={() => setConfirmOpen(true)}
                className="w-full max-w-md mx-auto flex items-center justify-center gap-2 border-2 border-foreground"
                style={{ boxShadow: "var(--shadow-press)" }}
              >
                <Trash2 className="size-5" />
                Borrar {selected.size === 1 ? "1 planta" : `${selected.size} plantas`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="rounded-2xl max-w-[calc(100vw-3rem)]">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-center">
                ¿Borrar {selected.size === 1 ? "esta planta" : `${selected.size} plantas`}?
              </DialogTitle>
              <DialogDescription className="text-base text-center">
                Se eliminarán de tu historial. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-3 pt-2">
              <Button variant="destructive" size="lg" onClick={handleDelete} className="w-full">
                Sí, borrar
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setConfirmOpen(false)} className="w-full text-muted-foreground">
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  );
}
