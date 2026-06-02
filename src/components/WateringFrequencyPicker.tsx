import { useEffect, useId, useRef, useState } from "react";
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
  /** Pre-fill value. Null → empty input. */
  currentIntervalDays: number | null;
  /** Plant common name for the dialog subtitle. */
  plantName: string;
  /** Called with the validated new value (already clamped 1-60). */
  onSave: (newDays: number) => void;
  /** Called when user cancels (button or overlay/Esc). */
  onCancel: () => void;
}

const MIN_DAYS = 1;
const MAX_DAYS = 60;

/**
 * D-13: bottom sheet con input numérico para editar la frecuencia de riego.
 *
 * Visual idiom verbatim de `PlantMapSheet`:
 * - side="bottom", rounded-t-2xl
 * - drag handle visual
 * - pb-[max(1.5rem,env(safe-area-inset-bottom))] para iOS home indicator
 * - max-h-[75dvh]
 *
 * Input: type="number" min={1} max={60}, clamped via onChange + onBlur.
 * Mobile: `inputMode="numeric"` levanta el numpad sin teclado completo.
 *
 * A11y:
 * - Input con label visible "Días entre riegos" + aria-describedby helper.
 * - Buttons: Cancelar (outline) + Guardar (hero/primary), stacked vertical.
 * - Focus management: al abrir, foco al input automáticamente.
 * - Esc o overlay tap cierra (heredado del shadcn Sheet behavior).
 */
export function WateringFrequencyPicker({
  open,
  currentIntervalDays,
  plantName,
  onSave,
  onCancel,
}: WateringFrequencyPickerProps) {
  const [value, setValue] = useState<string>(
    currentIntervalDays !== null ? String(currentIntervalDays) : "",
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const helperId = useId();
  const errorId = useId();
  const [showError, setShowError] = useState(false);

  // Reset/refill el value cuando el sheet se abre con nuevo plant.
  useEffect(() => {
    if (open) {
      setValue(currentIntervalDays !== null ? String(currentIntervalDays) : "");
      setShowError(false);
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open, currentIntervalDays]);

  const handleSave = () => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < MIN_DAYS || parsed > MAX_DAYS) {
      setShowError(true);
      return;
    }
    onSave(parsed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (showError) setShowError(false);
  };

  const handleBlur = () => {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > MAX_DAYS) {
      setValue(String(MAX_DAYS));
    } else if (Number.isFinite(parsed) && parsed < MIN_DAYS && parsed !== 0) {
      setValue(String(MIN_DAYS));
    }
  };

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
          <label
            htmlFor="watering-frequency-input"
            className="font-body text-sm font-semibold text-foreground"
          >
            Días entre riegos
          </label>
          <input
            ref={inputRef}
            id="watering-frequency-input"
            type="number"
            inputMode="numeric"
            min={MIN_DAYS}
            max={MAX_DAYS}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-describedby={`${helperId} ${showError ? errorId : ""}`.trim()}
            aria-invalid={showError}
            className="w-full px-4 py-3 bg-secondary border-2 border-foreground rounded-2xl font-display text-2xl font-bold text-foreground text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
            placeholder="7"
          />
          <p id={helperId} className="font-body text-xs text-muted-foreground">
            Entre {MIN_DAYS} y {MAX_DAYS} días.
          </p>
          {showError && (
            <p
              id={errorId}
              className="font-body text-xs text-destructive"
              role="alert"
            >
              Introduce un número entre {MIN_DAYS} y {MAX_DAYS}.
            </p>
          )}
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
