import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface WateringFrequencyPickerProps {
  open: boolean;
  /** Pre-fill value. Null → falls back to DEFAULT_DAYS (7). */
  currentIntervalDays: number | null;
  /** Plant common name for the dialog subtitle. */
  plantName: string;
  /** Called with the value (already clamped 1-60). */
  onSave: (newDays: number) => void;
  /** Called when user cancels (button or overlay/Esc). */
  onCancel: () => void;
}

const MIN_DAYS = 1;
const MAX_DAYS = 60;
const DEFAULT_DAYS = 7;

function clamp(n: number): number {
  if (n < MIN_DAYS) return MIN_DAYS;
  if (n > MAX_DAYS) return MAX_DAYS;
  return n;
}

/**
 * Bottom-sheet stepper to edit the watering frequency.
 *
 * Stepper (− / + buttons + display) instead of a number input — avoids the
 * iOS Safari keyboard overlaying our sheet in the PWA, and is faster UX on
 * mobile for a 1-60 range. No native picker, no keyboard, no invalid input
 * possible.
 */
export function WateringFrequencyPicker({
  open,
  currentIntervalDays,
  plantName,
  onSave,
  onCancel,
}: WateringFrequencyPickerProps) {
  const [value, setValue] = useState<number>(
    currentIntervalDays !== null ? clamp(currentIntervalDays) : DEFAULT_DAYS,
  );

  useEffect(() => {
    if (open) {
      setValue(
        currentIntervalDays !== null ? clamp(currentIntervalDays) : DEFAULT_DAYS,
      );
    }
  }, [open, currentIntervalDays]);

  const increment = () => setValue((v) => clamp(v + 1));
  const decrement = () => setValue((v) => clamp(v - 1));
  const handleSave = () => onSave(value);

  const atMin = value <= MIN_DAYS;
  const atMax = value >= MAX_DAYS;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <SheetContent
        side="bottom"
        className="bg-background border-t-2 border-foreground rounded-t-2xl p-6 max-h-[75dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-md sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
      >
        <div
          className="w-9 h-1 bg-foreground/25 rounded-full mx-auto mb-5"
          aria-hidden
        />

        <SheetHeader className="items-start text-left gap-1 p-0 mb-4">
          <SheetTitle className="font-display text-xl font-semibold leading-tight text-foreground">
            Frecuencia de riego
          </SheetTitle>
          <p className="font-body text-sm text-muted-foreground">{plantName}</p>
        </SheetHeader>

        <div className="flex flex-col gap-2 mb-6">
          <p className="font-body text-sm font-semibold text-foreground">
            Días entre riegos
          </p>
          <div className="flex items-center justify-between gap-3 bg-secondary border-2 border-foreground rounded-2xl p-2">
            <button
              type="button"
              onClick={decrement}
              disabled={atMin}
              aria-label="Disminuir un día"
              className="size-12 shrink-0 flex items-center justify-center rounded-xl bg-background border-2 border-foreground active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
              style={{ boxShadow: atMin ? "none" : "var(--shadow-press)" }}
            >
              <Minus className="size-5" strokeWidth={2.5} />
            </button>
            <output
              data-testid="watering-stepper-value"
              aria-live="polite"
              aria-atomic="true"
              className="font-display text-4xl font-bold text-foreground tabular-nums"
            >
              {value}
            </output>
            <button
              type="button"
              onClick={increment}
              disabled={atMax}
              aria-label="Aumentar un día"
              className="size-12 shrink-0 flex items-center justify-center rounded-xl bg-background border-2 border-foreground active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
              style={{ boxShadow: atMax ? "none" : "var(--shadow-press)" }}
            >
              <Plus className="size-5" strokeWidth={2.5} />
            </button>
          </div>
          <p className="font-body text-xs text-muted-foreground">
            Entre {MIN_DAYS} y {MAX_DAYS} días.
          </p>
        </div>

        <SheetFooter className="flex flex-col gap-2 sm:flex-col p-0">
          <Button
            variant="hero"
            size="default"
            onClick={handleSave}
            className="w-full font-display text-base font-bold min-h-11"
          >
            Guardar
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={onCancel}
            className="w-full font-body text-base font-semibold border-2 border-foreground min-h-11"
          >
            Cancelar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
