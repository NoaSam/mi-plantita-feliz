import { describe, it, expect, vi, afterEach } from "vitest";
import { isIOS } from "./platform";

describe("isIOS", () => {
  const original = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", { value: original, configurable: true });
  });

  function setUA(ua: string) {
    Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
  }

  it("returns true for iPhone", () => {
    setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(isIOS()).toBe(true);
  });

  it("returns true for iPad", () => {
    setUA("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    expect(isIOS()).toBe(true);
  });

  it("returns false for Android", () => {
    setUA("Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    expect(isIOS()).toBe(false);
  });

  it("returns false for desktop", () => {
    setUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(isIOS()).toBe(false);
  });
});
