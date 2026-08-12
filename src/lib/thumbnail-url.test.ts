import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getThumbnailUrl,
  resetThumbnailTierCacheForTests,
} from "./thumbnail-url";

/**
 * Sample Supabase Storage /object/public/ URL — matches the shape returned by
 * `supabase.storage.from(bucket).getPublicUrl(path)` after Phase 04.1-01
 * backfilled all legacy base64 rows to HTTPS.
 */
const SAMPLE =
  "https://foo.supabase.co/storage/v1/object/public/plant-images/user123/1234-abc.jpg";
const SAMPLE_2 =
  "https://foo.supabase.co/storage/v1/object/public/plant-images/user456/9999-xyz.jpg";

/** Let queued microtasks (fetch `.then` callbacks) flush before the next assertion. */
async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("thumbnail-url helper", () => {
  beforeEach(() => {
    resetThumbnailTierCacheForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ─── Suite A: Pure URL rewriting logic (no HEAD detection involved) ─────
  describe("Suite A: pure URL rewriting", () => {
    it("A1: passes through data: URIs unchanged", () => {
      vi.stubGlobal("fetch", vi.fn());
      const dataUri = "data:image/jpeg;base64,ABC";
      expect(getThumbnailUrl(dataUri)).toBe(dataUri);
      // No detection was triggered for a non-Supabase URL.
      expect(fetch).not.toHaveBeenCalled();
    });

    it("A2: passes through non-Supabase HTTPS URLs unchanged", () => {
      vi.stubGlobal("fetch", vi.fn());
      const external = "https://example.com/photo.jpg";
      expect(getThumbnailUrl(external)).toBe(external);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("A3: passes through empty string defensively", () => {
      vi.stubGlobal("fetch", vi.fn());
      expect(getThumbnailUrl("")).toBe("");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("A4: passes through null defensively without throwing", () => {
      vi.stubGlobal("fetch", vi.fn());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = getThumbnailUrl(null as any);
      // Helper returns the falsy value it received (null) without throwing.
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ─── Suite B: Tier detection behavior ────────────────────────────────────
  describe("Suite B: tier detection", () => {
    it("B1: initial call returns original URL and kicks off exactly one HEAD probe", () => {
      const fetchMock = vi.fn().mockReturnValue(new Promise(() => {})); // pending
      vi.stubGlobal("fetch", fetchMock);

      const result = getThumbnailUrl(SAMPLE);

      // First call returns ORIGINAL (never blocks).
      expect(result).toBe(SAMPLE);
      // HEAD probe was kicked off exactly once.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [probeUrl, init] = fetchMock.mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(probeUrl).toContain("/render/image/public/");
      expect(init?.method).toBe("HEAD");
    });

    it("B2: concurrent calls while HEAD is in-flight all return original and do not spawn more HEADs", () => {
      const fetchMock = vi.fn().mockReturnValue(new Promise(() => {})); // pending
      vi.stubGlobal("fetch", fetchMock);

      const r1 = getThumbnailUrl(SAMPLE);
      const r2 = getThumbnailUrl(SAMPLE_2);
      const r3 = getThumbnailUrl(SAMPLE);

      expect(r1).toBe(SAMPLE);
      expect(r2).toBe(SAMPLE_2);
      expect(r3).toBe(SAMPLE);
      // Only ONE HEAD across all three calls — the "detecting" latch works.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("B3: tier resolves 'available' → subsequent calls return transformed URL", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200 } as Response);
      vi.stubGlobal("fetch", fetchMock);

      // First call kicks off detection, returns original.
      expect(getThumbnailUrl(SAMPLE)).toBe(SAMPLE);
      // Let the fetch promise `.then` fire.
      await flushMicrotasks();

      const result = getThumbnailUrl(SAMPLE);
      expect(result).toContain("/render/image/public/");
      expect(result).toContain("width=200");
      expect(result).toContain("quality=70");
      // No new HEAD requests once resolved.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("B4: tier resolves 'unavailable' (400) → subsequent calls keep returning original (Free plan behavior)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 400 } as Response);
      vi.stubGlobal("fetch", fetchMock);

      expect(getThumbnailUrl(SAMPLE)).toBe(SAMPLE);
      await flushMicrotasks();

      // Free plan: original URL is served forever.
      expect(getThumbnailUrl(SAMPLE)).toBe(SAMPLE);
      expect(getThumbnailUrl(SAMPLE_2)).toBe(SAMPLE_2);
      // Detection stays one-shot even after failure.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("B5: tier resolves 'unavailable' on network error → subsequent calls keep returning original", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
      vi.stubGlobal("fetch", fetchMock);

      expect(getThumbnailUrl(SAMPLE)).toBe(SAMPLE);
      await flushMicrotasks();

      expect(getThumbnailUrl(SAMPLE)).toBe(SAMPLE);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("B6: honors custom width and quality when tier is 'available'", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200 } as Response);
      vi.stubGlobal("fetch", fetchMock);

      getThumbnailUrl(SAMPLE);
      await flushMicrotasks();

      const result = getThumbnailUrl(SAMPLE, 160, 80);
      expect(result).toContain("width=160");
      expect(result).toContain("quality=80");
    });

    it("B7: appends transform params with `&` when the URL already has a query string", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200 } as Response);
      vi.stubGlobal("fetch", fetchMock);

      const urlWithToken = `${SAMPLE}?token=abc`;
      getThumbnailUrl(urlWithToken);
      await flushMicrotasks();

      const result = getThumbnailUrl(urlWithToken);
      // Preserves original query param.
      expect(result).toContain("token=abc");
      // Appends transform params without breaking the URL.
      expect(result).toContain("width=200");
      expect(result).toContain("quality=70");
      // Uses & (not a second ?).
      expect(result.match(/\?/g)?.length ?? 0).toBe(1);
    });

    it("B8: rewrites /object/public/ → /render/image/public/ when transformed", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200 } as Response);
      vi.stubGlobal("fetch", fetchMock);

      getThumbnailUrl(SAMPLE);
      await flushMicrotasks();

      const result = getThumbnailUrl(SAMPLE);
      expect(result).not.toContain("/object/public/");
      expect(result).toContain("/render/image/public/");
    });

    it("B9: detection probe URL targets the render/image endpoint (not the original object URL)", () => {
      const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
      vi.stubGlobal("fetch", fetchMock);

      getThumbnailUrl(SAMPLE);

      const [probeUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      // Sanity: probe URL derives from the sample URL and includes a width param.
      expect(probeUrl).toMatch(
        /https:\/\/foo\.supabase\.co\/storage\/v1\/render\/image\/public\/plant-images\/.*width=\d+/,
      );
    });

    it("B10: does not spawn a HEAD probe for data: URIs even when tier is unknown", () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const dataUri = "data:image/jpeg;base64,QUJD";
      expect(getThumbnailUrl(dataUri)).toBe(dataUri);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("B11: never returns a Promise (helper must be synchronous)", () => {
      const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
      vi.stubGlobal("fetch", fetchMock);

      const result = getThumbnailUrl(SAMPLE);
      // Guard against accidental refactor to async.
      expect(typeof (result as unknown as Promise<unknown>).then).toBe(
        "undefined",
      );
    });

    it("B12: resetThumbnailTierCacheForTests re-arms detection for a fresh probe", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 400 } as Response);
      vi.stubGlobal("fetch", fetchMock);

      getThumbnailUrl(SAMPLE);
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Reset the cache and confirm the next call kicks off a NEW detection.
      resetThumbnailTierCacheForTests();
      getThumbnailUrl(SAMPLE);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
