import { describe, it, expect } from "vitest";
import {
  extractScientificName,
  normalizeScientificName,
  extractGenus,
  computeConsensus,
} from "../../supabase/functions/identify-plant/consensus.ts";

// ─── extractScientificName ────────────────────────────────────────────────────

describe("extractScientificName", () => {
  it("extracts a standard binomial", () => {
    expect(extractScientificName("Potus (Epipremnum aureum)")).toBe("epipremnum aureum");
  });

  it("extracts when common name has multiple words", () => {
    expect(extractScientificName("Hiedra del diablo (Epipremnum aureum)")).toBe("epipremnum aureum");
  });

  it("returns null when no parentheses", () => {
    expect(extractScientificName("Potus")).toBeNull();
  });

  it("returns null when parenthesized content is lowercase common word", () => {
    expect(extractScientificName("Planta (verde)")).toBeNull();
  });

  it("handles cultivar in parentheses", () => {
    expect(extractScientificName("Potus dorado (Epipremnum aureum 'Golden')"))
      .toBe("epipremnum aureum 'golden'");
  });

  it("picks first binomial when multiple parenthesized segments", () => {
    expect(extractScientificName("Ficus (Ficus elastica) (Moraceae)"))
      .toBe("ficus elastica");
  });

  it("handles genus-only name", () => {
    expect(extractScientificName("Orquídea (Phalaenopsis)")).toBe("phalaenopsis");
  });

  it("handles spp. suffix", () => {
    expect(extractScientificName("Geranio (Pelargonium spp.)")).toBe("pelargonium spp.");
  });

  it("handles hybrid marker in name", () => {
    expect(extractScientificName("Geranio (Pelargonium x hortorum)")).toBe("pelargonium x hortorum");
  });
});

// ─── normalizeScientificName ──────────────────────────────────────────────────

describe("normalizeScientificName", () => {
  it("strips cultivar in single quotes", () => {
    expect(normalizeScientificName("epipremnum aureum 'golden'")).toBe("epipremnum aureum");
  });

  it("strips var. infraspecific rank", () => {
    expect(normalizeScientificName("hedera helix var. hibernica")).toBe("hedera helix");
  });

  it("strips subsp. infraspecific rank", () => {
    expect(normalizeScientificName("pinus sylvestris subsp. iberica")).toBe("pinus sylvestris");
  });

  it("strips f. (forma) rank", () => {
    expect(normalizeScientificName("rosa canina f. inermis")).toBe("rosa canina");
  });

  it("strips hybrid marker ×", () => {
    expect(normalizeScientificName("× fatsia lizei")).toBe("fatsia lizei");
  });

  it("strips hybrid marker x (lowercase)", () => {
    expect(normalizeScientificName("pelargonium x hortorum")).toBe("pelargonium hortorum");
  });

  it("leaves clean name unchanged", () => {
    expect(normalizeScientificName("epipremnum aureum")).toBe("epipremnum aureum");
  });

  it("strips spp. placeholder", () => {
    expect(normalizeScientificName("pelargonium spp.")).toBe("pelargonium");
  });

  it("collapses whitespace", () => {
    expect(normalizeScientificName("rosa  canina  'red'  ")).toBe("rosa canina");
  });
});

// ─── extractGenus ─────────────────────────────────────────────────────────────

describe("extractGenus", () => {
  it("returns first word of binomial", () => {
    expect(extractGenus("epipremnum aureum")).toBe("epipremnum");
  });

  it("returns the word for single-word names", () => {
    expect(extractGenus("phalaenopsis")).toBe("phalaenopsis");
  });

  it("returns null for empty string", () => {
    expect(extractGenus("")).toBeNull();
  });
});

// ─── computeConsensus ─────────────────────────────────────────────────────────

describe("computeConsensus", () => {
  it("exact match — all three agree", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: "epipremnum aureum" },
      { model: "gemini" as const, success: true, scientificName: "epipremnum aureum" },
      { model: "gpt4o" as const, success: true, scientificName: "epipremnum aureum" },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")).toEqual({ verdict: "correct", matchLevel: "exact" });
    expect(out.get("gemini")).toEqual({ verdict: "correct", matchLevel: "exact" });
    expect(out.get("gpt4o")).toEqual({ verdict: "correct", matchLevel: "exact" });
  });

  it("normalized match — cultivar difference ignored", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: "sansevieria trifasciata 'laurentii'" },
      { model: "gemini" as const, success: true, scientificName: "sansevieria trifasciata" },
      { model: "gpt4o" as const, success: true, scientificName: "sansevieria trifasciata" },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")).toEqual({ verdict: "correct", matchLevel: "normalized" });
    expect(out.get("gemini")).toEqual({ verdict: "correct", matchLevel: "exact" });
    expect(out.get("gpt4o")).toEqual({ verdict: "correct", matchLevel: "exact" });
  });

  it("genus match — real case: lavandula species differ", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: "lavandula angustifolia" },
      { model: "gemini" as const, success: true, scientificName: "lavandula" },
      { model: "gpt4o" as const, success: true, scientificName: "lavandula stoechas" },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")!.verdict).toBe("correct");
    expect(out.get("claude")!.matchLevel).toBe("genus");
    expect(out.get("gemini")!.verdict).toBe("correct");
    expect(out.get("gpt4o")!.verdict).toBe("correct");
  });

  it("genus match — real case: pelargonium variants", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: "pelargonium x hortorum" },
      { model: "gemini" as const, success: true, scientificName: "pelargonium x domesticum" },
      { model: "gpt4o" as const, success: true, scientificName: "pelargonium spp." },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")!.verdict).toBe("correct");
    expect(out.get("gemini")!.verdict).toBe("correct");
    expect(out.get("gpt4o")!.verdict).toBe("correct");
  });

  it("genus match — 2 agree, 1 disagrees entirely", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: "platanus × acerifolia" },
      { model: "gemini" as const, success: true, scientificName: "populus nigra" },
      { model: "gpt4o" as const, success: true, scientificName: "platanus x hispanica" },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")!.verdict).toBe("correct");
    expect(out.get("gpt4o")!.verdict).toBe("correct");
    expect(out.get("gemini")).toEqual({ verdict: "no_consensus", matchLevel: null });
  });

  it("no consensus — all three genuinely disagree", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: "persea americana" },
      { model: "gemini" as const, success: true, scientificName: "zantedeschia aethiopica" },
      { model: "gpt4o" as const, success: true, scientificName: "philodendron" },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")).toEqual({ verdict: "no_consensus", matchLevel: null });
    expect(out.get("gemini")).toEqual({ verdict: "no_consensus", matchLevel: null });
    expect(out.get("gpt4o")).toEqual({ verdict: "no_consensus", matchLevel: null });
  });

  it("failed model always gets no_consensus", () => {
    const results = [
      { model: "claude" as const, success: false, scientificName: "epipremnum aureum" },
      { model: "gemini" as const, success: true, scientificName: "epipremnum aureum" },
      { model: "gpt4o" as const, success: true, scientificName: "epipremnum aureum" },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")).toEqual({ verdict: "no_consensus", matchLevel: null });
    expect(out.get("gemini")).toEqual({ verdict: "correct", matchLevel: "exact" });
  });

  it("only one successful model — no consensus possible", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: "epipremnum aureum" },
      { model: "gemini" as const, success: false, scientificName: null },
      { model: "gpt4o" as const, success: false, scientificName: null },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")).toEqual({ verdict: "no_consensus", matchLevel: null });
  });

  it("exact beats normalized when both apply", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: "chlorophytum comosum" },
      { model: "gemini" as const, success: true, scientificName: "chlorophytum comosum 'vittatum'" },
      { model: "gpt4o" as const, success: true, scientificName: "chlorophytum comosum" },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")).toEqual({ verdict: "correct", matchLevel: "exact" });
    expect(out.get("gpt4o")).toEqual({ verdict: "correct", matchLevel: "exact" });
    expect(out.get("gemini")).toEqual({ verdict: "correct", matchLevel: "normalized" });
  });

  it("null scientificName treated as failed", () => {
    const results = [
      { model: "claude" as const, success: true, scientificName: null },
      { model: "gemini" as const, success: true, scientificName: "sedum morganianum" },
      { model: "gpt4o" as const, success: true, scientificName: "crasulaceae" },
    ];
    const out = computeConsensus(results);
    expect(out.get("claude")).toEqual({ verdict: "no_consensus", matchLevel: null });
    expect(out.get("gemini")).toEqual({ verdict: "no_consensus", matchLevel: null });
    expect(out.get("gpt4o")).toEqual({ verdict: "no_consensus", matchLevel: null });
  });
});
