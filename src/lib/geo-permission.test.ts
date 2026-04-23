import { describe, it, expect, beforeEach } from "vitest";
import {
  getGeoPermission,
  shouldAskForLocation,
  hasAcceptedLocation,
  recordAccept,
  recordDecline,
} from "./geo-permission";

describe("geo-permission", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getGeoPermission", () => {
    it("returns null when nothing stored", () => {
      expect(getGeoPermission()).toBeNull();
    });

    it("returns stored state", () => {
      localStorage.setItem(
        "plantita_geo_permission",
        JSON.stringify({ status: "accepted", declineCount: 0 })
      );
      expect(getGeoPermission()).toEqual({ status: "accepted", declineCount: 0 });
    });

    it("returns null on corrupt JSON", () => {
      localStorage.setItem("plantita_geo_permission", "not-json");
      expect(getGeoPermission()).toBeNull();
    });
  });

  describe("shouldAskForLocation", () => {
    it("returns true when never asked", () => {
      expect(shouldAskForLocation()).toBe(true);
    });

    it("returns false after acceptance", () => {
      recordAccept();
      expect(shouldAskForLocation()).toBe(false);
    });

    it("returns true while still pending (declined < 3 times)", () => {
      recordDecline();
      expect(shouldAskForLocation()).toBe(true);
    });

    it("returns false after dismissed (3 declines)", () => {
      recordDecline();
      recordDecline();
      recordDecline();
      expect(shouldAskForLocation()).toBe(false);
    });
  });

  describe("hasAcceptedLocation", () => {
    it("returns false when never asked", () => {
      expect(hasAcceptedLocation()).toBe(false);
    });

    it("returns true after acceptance", () => {
      recordAccept();
      expect(hasAcceptedLocation()).toBe(true);
    });

    it("returns false after decline", () => {
      recordDecline();
      expect(hasAcceptedLocation()).toBe(false);
    });
  });

  describe("recordAccept", () => {
    it("saves accepted state with zero decline count", () => {
      recordAccept();
      expect(getGeoPermission()).toEqual({ status: "accepted", declineCount: 0 });
    });

    it("overrides previous declines", () => {
      recordDecline();
      recordDecline();
      recordAccept();
      expect(getGeoPermission()).toEqual({ status: "accepted", declineCount: 0 });
    });
  });

  describe("recordDecline", () => {
    it("increments decline count starting from 0", () => {
      recordDecline();
      expect(getGeoPermission()).toEqual({ status: "pending", declineCount: 1 });
    });

    it("increments decline count on subsequent calls", () => {
      recordDecline();
      recordDecline();
      expect(getGeoPermission()).toEqual({ status: "pending", declineCount: 2 });
    });

    it("sets dismissed after exactly 3 declines", () => {
      recordDecline();
      recordDecline();
      recordDecline();
      expect(getGeoPermission()).toEqual({ status: "dismissed", declineCount: 3 });
    });

    it("stays dismissed after more than 3 declines", () => {
      recordDecline();
      recordDecline();
      recordDecline();
      recordDecline();
      expect(getGeoPermission()).toEqual({ status: "dismissed", declineCount: 4 });
    });
  });
});
