import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Leaf, Search, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
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
import HistorySummary from "@/components/HistorySummary";
import ContextChip from "@/components/ContextChip";
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
  const { history, isLoading, deletePlants, refetch } = usePlantHistory();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contextParam = searchParams.get("context");
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Refetch on mount + on every navigation back to /mis-plantas (D-12).
  useEffect(() => {
    refetch();
  }, [location.pathname, refetch]);

  // Refetch when an anon→auth flow auto-classifies a plant elsewhere,
  // or when the user classifies/reverts via the UI (Phase 03.1).
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("mp:pending-classification-resolved", handler);
    window.addEventListener("mp:plant-context-updated", handler);
    return () => {
      window.removeEventListener("mp:pending-classification-resolved", handler);
      window.removeEventListener("mp:plant-context-updated", handler);
    };
  }, [refetch]);

  const filtered = useMemo(() => {
    return history.filter((item: PlantResult) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchesMonth = monthFilter === 0 || new Date(item.date).getMonth() + 1 === monthFilter;
      const matchesContext = contextParam !== "unclassified" || item.context === "unclassified";
      return matchesSearch && matchesMonth && matchesContext;
    });
  }, [history, search, monthFilter, contextParam]);

  const counts = useMemo(() => ({
    totalCount: history.length,
    homeCount: history.filter((p) => p.context === "home").length,
    wildCount: history.filter((p) => p.context === "wild").length,
    unclassifiedCount: history.filter((p) => p.context === "unclassified" || !p.context).length,
  }), [history]);

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

  const handleBack = () => {
    // Phase 3 (03-01) moved this page from /mis-plantas → /ajustes/mis-plantas.
    // It now lives as a sub-route under Settings, so the user needs a way back
    // to /ajustes. Mirror PlantDetail's defensive fallback for iOS PWA standalone
    // where window.history may be empty on a deep link.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/ajustes", { replace: true });
    }
  };

  return (
    <RequireAuth>
      <div className="px-6 py-8 pb-24">
        {/* Back navigation — Phase 3 (03-01) made this a sub-route under /ajustes */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Volver a ajustes"
          className="inline-flex items-center gap-1.5 mb-4 -ml-1 py-2 pr-3 pl-1 rounded-lg text-foreground hover:bg-foreground/5 active:bg-foreground/10 transition-colors"
        >
          <ArrowLeft className="size-5" strokeWidth={2} />
          <span className="font-body text-sm font-medium">Atrás</span>
        </button>

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

        {/* Summary strip */}
        {!isLoading && history.length > 0 && (
          <HistorySummary
            totalCount={counts.totalCount}
            homeCount={counts.homeCount}
            wildCount={counts.wildCount}
            unclassifiedCount={counts.unclassifiedCount}
          />
        )}

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
            {filtered.map((item: PlantResult, index: number) => (
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
                      // Contract per docs/posthog-events.md § Phase 02.1: { context, position }
                      track("history_item_clicked", { context: item.context, position: index });
                      navigate(`/planta/${item.id}`);
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

                  {/* Context chip */}
                  {!editMode && (
                    <ContextChip context={item.context ?? "unclassified"} />
                  )}
                </div>
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
