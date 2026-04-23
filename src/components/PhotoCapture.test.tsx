import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PhotoCapture from "./PhotoCapture";

// Mock dependencies that PhotoCapture imports
vi.mock("@/hooks/use-geolocation", () => ({
  useGeolocation: () => ({ getLocation: vi.fn(), getLocationSilently: vi.fn() }),
  isBrowserPermissionGranted: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/geo-permission", () => ({
  shouldAskForLocation: () => false,
  hasAcceptedLocation: () => false,
  recordAccept: vi.fn(),
  recordDecline: vi.fn(),
}));

vi.mock("@/lib/platform", () => ({ isIOS: vi.fn(), isNative: vi.fn().mockReturnValue(false) }));

import { isIOS } from "@/lib/platform";
const mockIsIOS = vi.mocked(isIOS);

const noop = vi.fn();

function renderCapture(loading = false) {
  return render(<PhotoCapture onCapture={noop} isLoading={loading} />);
}

describe("PhotoCapture", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("on iOS", () => {
    beforeEach(() => mockIsIOS.mockReturnValue(true));

    it("renders a single file input without capture attribute", () => {
      const { container } = renderCapture();
      const inputs = container.querySelectorAll('input[type="file"]');
      expect(inputs).toHaveLength(1);
      expect(inputs[0].hasAttribute("capture")).toBe(false);
    });

    it("does not show gallery link", () => {
      renderCapture();
      expect(screen.queryByText("Subir desde galería")).toBeNull();
    });

    it("shows the hero button", () => {
      renderCapture();
      expect(screen.getByText("Hacer foto ahora")).toBeTruthy();
    });
  });

  describe("on Android", () => {
    beforeEach(() => mockIsIOS.mockReturnValue(false));

    it("renders two file inputs", () => {
      const { container } = renderCapture();
      const inputs = container.querySelectorAll('input[type="file"]');
      expect(inputs).toHaveLength(2);
    });

    it("first input has capture=environment", () => {
      const { container } = renderCapture();
      const inputs = container.querySelectorAll('input[type="file"]');
      expect(inputs[0].getAttribute("capture")).toBe("environment");
    });

    it("second input has no capture attribute (gallery)", () => {
      const { container } = renderCapture();
      const inputs = container.querySelectorAll('input[type="file"]');
      expect(inputs[1].hasAttribute("capture")).toBe(false);
    });

    it("shows gallery link without icon", () => {
      renderCapture();
      const link = screen.getByText("Subir desde galería");
      expect(link).toBeTruthy();
      // No SVG icon inside the gallery button
      expect(link.querySelector("svg")).toBeNull();
    });

    it("shows the hero button", () => {
      renderCapture();
      expect(screen.getByText("Hacer foto ahora")).toBeTruthy();
    });
  });
});
