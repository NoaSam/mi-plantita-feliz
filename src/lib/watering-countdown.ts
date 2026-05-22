/**
 * Pure-function helpers for the Phase 3 calendar countdown.
 *
 * D-08 formula:
 *   X = floor((last_watered_at_ms + interval_days * 86400000 - now_ms) / 86400000)
 *
 * - X > 0   → normal       (Regada button, gray badge)
 * - X === 0 → urgent       (Regar button, soft-warn badge)
 * - X < 0   → overdue      (Regar button, soft-warn badge)
 * - lastWateredAt OR intervalDays null → pending-first (no countdown)
 *
 * Timezone-agnostic: uses UTC ms math. Sub-day elapsed time gets floored
 * — see Risk #13 in 03-RESEARCH.md.
 */

export type WateringStatus = "normal" | "urgent" | "overdue" | "pending-first";

const DAY_MS = 86_400_000;

/**
 * Returns the days remaining until next watering.
 * Null when either input is null (pending-first state).
 *
 * Positive = future, 0 = today, negative = overdue.
 */
export function computeDaysRemaining(
  lastWateredAt: string | null,
  intervalDays: number | null,
  now: Date = new Date(),
): number | null {
  if (lastWateredAt === null || intervalDays === null) return null;
  const lastMs = new Date(lastWateredAt).getTime();
  const targetMs = lastMs + intervalDays * DAY_MS;
  const remainingMs = targetMs - now.getTime();
  return Math.floor(remainingMs / DAY_MS);
}

/**
 * Wraps computeDaysRemaining with status derivation per D-08.
 */
export function computeStatus(args: {
  lastWateredAt: string | null;
  intervalDays: number | null;
  now?: Date;
}): { status: WateringStatus; daysRemaining: number | null } {
  const daysRemaining = computeDaysRemaining(
    args.lastWateredAt,
    args.intervalDays,
    args.now,
  );
  if (daysRemaining === null) {
    return { status: "pending-first", daysRemaining: null };
  }
  if (daysRemaining > 0) return { status: "normal", daysRemaining };
  if (daysRemaining === 0) return { status: "urgent", daysRemaining: 0 };
  return { status: "overdue", daysRemaining };
}
