export interface HistorySummaryProps {
  totalCount: number;
  homeCount: number;
  wildCount: number;
  unclassifiedCount: number;
}

export default function HistorySummary({
  totalCount,
  homeCount,
  wildCount,
  unclassifiedCount,
}: HistorySummaryProps) {
  return (
    <aside
      aria-label="Resumen del historial"
      className="flex items-center gap-2 px-3 py-2.5 bg-secondary rounded-xl my-4"
    >
      <span className="text-base shrink-0" aria-hidden>📊</span>
      <p className="font-body text-sm text-muted-foreground leading-snug">
        De <strong className="text-foreground font-semibold">{totalCount} plantas</strong>:{' '}
        <strong className="text-foreground font-semibold">{homeCount}</strong> jardín ·{' '}
        <strong className="text-foreground font-semibold">{wildCount}</strong> descubrimientos ·{' '}
        <strong className="text-foreground font-semibold">{unclassifiedCount}</strong> sin clasificar
      </p>
    </aside>
  );
}
