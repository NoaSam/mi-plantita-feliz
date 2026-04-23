import { describe, it, expect, beforeEach } from "vitest";
import { getAnonymousId, hasAnonymousId, clearAnonymousId } from "./anonymous-id";

const STORAGE_KEY = "plantita_anon_id";

describe("anonymous-id", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAnonymousId(); // also clears the in-memory cache
  });

  describe("hasAnonymousId", () => {
    it("returns false when no ID exists", () => {
      expect(hasAnonymousId()).toBe(false);
    });

    it("returns true after generating an ID", () => {
      getAnonymousId();
      expect(hasAnonymousId()).toBe(true);
    });
  });

  describe("getAnonymousId", () => {
    it("generates a UUID on first call", () => {
      const id = getAnonymousId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("returns the same ID on subsequent calls", () => {
      const first = getAnonymousId();
      const second = getAnonymousId();
      expect(first).toBe(second);
    });

    it("persists ID to localStorage", () => {
      const id = getAnonymousId();
      expect(localStorage.getItem(STORAGE_KEY)).toBe(id);
    });

    it("recovers ID from localStorage when cache is cleared", () => {
      const id = getAnonymousId();
      clearAnonymousId(); // clears cache
      localStorage.setItem(STORAGE_KEY, id); // but localStorage still has it
      expect(getAnonymousId()).toBe(id);
    });
  });

  describe("clearAnonymousId", () => {
    it("removes ID from localStorage and cache", () => {
      getAnonymousId();
      clearAnonymousId();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(hasAnonymousId()).toBe(false);
    });

    it("causes next getAnonymousId to generate a new ID", () => {
      const first = getAnonymousId();
      clearAnonymousId();
      const second = getAnonymousId();
      expect(second).not.toBe(first);
    });
  });
});
