/**
 * Unit tests for pure helpers in backfill-image-urls.ts
 *
 * These test only side-effect-free logic (data URI parsing, idempotency filter,
 * filename builder, media-type-to-extension mapping). The runtime path (network
 * calls, DB updates, batching) is validated by the CPO's manual checkpoint run
 * per D-05, not by unit tests.
 */
import { describe, it, expect } from "vitest";
import {
  parseDataUri,
  isLegacyRow,
  buildFileName,
  extForMediaType,
} from "./backfill-image-urls";

describe("parseDataUri", () => {
  it("parses a well-formed jpeg data URI", () => {
    expect(parseDataUri("data:image/jpeg;base64,ABC")).toEqual({
      mediaType: "image/jpeg",
      base64Data: "ABC",
    });
  });

  it("parses a well-formed png data URI with padding", () => {
    expect(parseDataUri("data:image/png;base64,XYZ==")).toEqual({
      mediaType: "image/png",
      base64Data: "XYZ==",
    });
  });

  it("returns null for an HTTPS URL (already migrated)", () => {
    expect(parseDataUri("https://example.com/a.jpg")).toBeNull();
  });

  it("returns null for a data URI without base64 marker", () => {
    expect(parseDataUri("data:not-base64,malformed")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseDataUri("")).toBeNull();
  });
});

describe("isLegacyRow", () => {
  it("returns true for rows whose image_url starts with 'data:'", () => {
    expect(isLegacyRow({ image_url: "data:image/jpeg;base64,..." })).toBe(true);
  });

  it("returns false for rows already migrated to HTTPS", () => {
    expect(
      isLegacyRow({
        image_url:
          "https://project.supabase.co/storage/v1/object/public/plant-images/x.jpg",
      })
    ).toBe(false);
  });

  it("returns false for empty image_url (defensive)", () => {
    expect(isLegacyRow({ image_url: "" })).toBe(false);
  });
});

describe("buildFileName", () => {
  it("produces a filename matching {userId}/{ts}-backfill-{rand}.{ext}", () => {
    const name = buildFileName("user123", "jpg");
    expect(name).toMatch(/^user123\/\d+-backfill-[a-z0-9]{6}\.jpg$/);
  });

  it("uses the .png extension when ext='png'", () => {
    const name = buildFileName("user123", "png");
    expect(name).toMatch(/\.png$/);
  });

  it("produces different filenames on successive calls (randomness)", () => {
    const a = buildFileName("u", "jpg");
    const b = buildFileName("u", "jpg");
    expect(a).not.toBe(b);
  });
});

describe("extForMediaType", () => {
  it("maps image/jpeg to jpg", () => {
    expect(extForMediaType("image/jpeg")).toBe("jpg");
  });

  it("maps image/png to png", () => {
    expect(extForMediaType("image/png")).toBe("png");
  });

  it("maps image/webp to webp", () => {
    expect(extForMediaType("image/webp")).toBe("webp");
  });

  it("falls back to jpg for unknown media types", () => {
    expect(extForMediaType("image/gif")).toBe("jpg");
  });
});
