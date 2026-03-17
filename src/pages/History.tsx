import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePlantHistory } from "@/hooks/use-plant-history";
import type { PlantResult } from "@/hooks/use-plant-identifier";

const MONTHS = [
  "Todos", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function HistoryPage() {
  const navigate = useNavigate();
  const { history } = usePlantHistory();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return history.filter((item: PlantResult) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchesMonth = monthFilter === 0 || new Date(item.date).getMonth() + 1 === monthFilter;
      return matchesSearch && matchesMonth;
    });
  }, [history, search, monthFilter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="back" size="default" onClick={() => navigate("/")}>
            <ArrowLeft className="size-6" />
            Atrás
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Mis Plantas
          </h1>
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
        {filtered.length === 0 ? (
          <p className="text-center text-xl text-muted-foreground py-12">
            No hay plantas guardadas
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item: PlantResult) => (
              <motion.div
                key={item.id}
                layout
                className="border-2 border-foreground rounded-2xl overflow-hidden bg-secondary/50 cursor-pointer active:translate-y-0.5 transition-transform"
                style={{ boxShadow: "var(--shadow-press)" }}
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                {/* Row */}
                <div className="flex items-center gap-4 p-4 min-h-[100px]">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="size-20 rounded-xl object-cover border-2 border-foreground shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-xl font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-base text-muted-foreground">
                      {new Date(item.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === item.id && (
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
                      <p className="text-base leading-relaxed">{item.description}</p>
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold mb-1">💧 Cuidados</h3>
                      <p className="text-base leading-relaxed">{item.care}</p>
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold mb-1">🔍 Diagnóstico</h3>
                      <p className="text-base leading-relaxed">{item.diagnosis}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
