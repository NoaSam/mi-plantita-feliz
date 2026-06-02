import { describe, it, expect, vi } from "vitest";
import {
  computeDaysRemaining,
  computeStatus,
} from "./watering-countdown";

const NOW = new Date("2026-05-17T12:00:00Z");

function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * 86_400_000).toISOString();
}

describe("computeDaysRemaining", () => {
  it("returns null when lastWateredAt is null", () => {
    expect(computeDaysRemaining(null, 5, NOW)).toBeNull();
  });

  it("returns null when intervalDays is null", () => {
    expect(computeDaysRemaining(daysAgo(3), null, NOW)).toBeNull();
  });

  it("returns null when both are null", () => {
    expect(computeDaysRemaining(null, null, NOW)).toBeNull();
  });

  it("returns positive when next watering is in the future (X > 0)", () => {
    // watered 3 days ago, interval 7 → next in 4 days
    expect(computeDaysRemaining(daysAgo(3), 7, NOW)).toBe(4);
  });

  it("returns 0 when due today (X === 0)", () => {
    // watered 7 days ago, interval 7 → due now
    expect(computeDaysRemaining(daysAgo(7), 7, NOW)).toBe(0);
  });

  it("returns negative when overdue (X < 0)", () => {
    // watered 10 days ago, interval 7 → 3 days overdue
    expect(computeDaysRemaining(daysAgo(10), 7, NOW)).toBe(-3);
  });

  it("uses floor of day diff (sub-day elapsed time)", () => {
    // watered 23:59 ago (just under 24h), interval 1 → X should be 0 (less than 1 full day until target)
    const lastWatered = new Date(NOW.getTime() - 23 * 3_600_000 - 59 * 60_000).toISOString();
    expect(computeDaysRemaining(lastWatered, 1, NOW)).toBe(0);
  });

  it("respects exact midnight transitions (full days only)", () => {
    // watered exactly now, interval 5 → 5 days remaining
    const lastWatered = NOW.toISOString();
    expect(computeDaysRemaining(lastWatered, 5, NOW)).toBe(5);
  });

  it("defaults `now` to current date when omitted (smoke test)", () => {
    // VERIFICATION ajuste #1: lock the clock so the smoke test doesn't
    // depend on the wall clock at all. Result is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));
    try {
      const lastWatered = new Date("2026-05-14T12:00:00Z").toISOString();  // exactly 3 days ago
      const result = computeDaysRemaining(lastWatered, 7);
      // 3 days elapsed, interval 7 → 4 days remaining. Exact.
      expect(result).toBe(4);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("computeStatus", () => {
  it("returns pending-first when lastWateredAt is null", () => {
    const r = computeStatus({ lastWateredAt: null, intervalDays: 5, now: NOW });
    expect(r.status).toBe("pending-first");
    expect(r.daysRemaining).toBeNull();
  });

  it("returns pending-first when intervalDays is null", () => {
    const r = computeStatus({
      lastWateredAt: daysAgo(3),
      intervalDays: null,
      now: NOW,
    });
    expect(r.status).toBe("pending-first");
    expect(r.daysRemaining).toBeNull();
  });

  it("returns normal when X > 0", () => {
    const r = computeStatus({
      lastWateredAt: daysAgo(3),
      intervalDays: 7,
      now: NOW,
    });
    expect(r.status).toBe("normal");
    expect(r.daysRemaining).toBe(4);
  });

  it("returns urgent when X === 0", () => {
    const r = computeStatus({
      lastWateredAt: daysAgo(7),
      intervalDays: 7,
      now: NOW,
    });
    expect(r.status).toBe("urgent");
    expect(r.daysRemaining).toBe(0);
  });

  it("returns overdue when X < 0", () => {
    const r = computeStatus({
      lastWateredAt: daysAgo(10),
      intervalDays: 7,
      now: NOW,
    });
    expect(r.status).toBe("overdue");
    expect(r.daysRemaining).toBe(-3);
  });
});
