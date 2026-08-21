import { describe, it, expect } from "vitest";
import {
  extractScientificName,
  normalizeScientificName,
  extractGenus,
  computeConsensus,
  matchScientific,  // ← nuevo (Task 1)
  applyPlantnetOverride,  // ← nuevo (Task 2)
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

// ─── matchScientific ──────────────────────────────────────────────────────────

describe("matchScientific", () => {
  it("returns 'exact' when strings are identical", () => {
    expect(matchScientific("epipremnum aureum", "epipremnum aureum")).toBe("exact");
  });

  it("returns 'normalized' when only differ by cultivar", () => {
    expect(matchScientific("epipremnum aureum 'golden'", "epipremnum aureum")).toBe("normalized");
  });

  it("returns 'normalized' when only differ by infraspecific rank", () => {
    expect(matchScientific("hedera helix var. hibernica", "hedera helix")).toBe("normalized");
  });

  it("returns 'genus' when same first word but different species", () => {
    expect(matchScientific("ficus lyrata", "ficus benjamina")).toBe("genus");
  });

  it("returns null when different genus", () => {
    expect(matchScientific("epipremnum aureum", "monstera deliciosa")).toBeNull();
  });

  it("returns null when either input is null", () => {
    expect(matchScientific(null, "epipremnum aureum")).toBeNull();
    expect(matchScientific("epipremnum aureum", null)).toBeNull();
  });

  it("returns null when either input is empty string", () => {
    expect(matchScientific("", "epipremnum aureum")).toBeNull();
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

// ─── applyPlantnetOverride (Phase 5 D-01) ─────────────────────────────────────

describe("applyPlantnetOverride", () => {
  const llmA = { model: "claude" as const, scientificName: "monstera deliciosa" };
  const llmB = { model: "gemini" as const, scientificName: "epipremnum aureum" };
  const llmC = { model: "gpt4o" as const,  scientificName: "ficus lyrata" };
  const llms = [llmA, llmB, llmC];

  it("returns winner untouched when plantnet is null (D-09)", () => {
    const r = applyPlantnetOverride(llmA, llms, null);
    expect(r.winner).toBe(llmA);
    expect(r.diverged).toBe(false);
    expect(r.matchedLlm).toBeNull();
  });

  it("returns winner untouched when plantnet.success is false", () => {
    const r = applyPlantnetOverride(llmA, llms, {
      success: false, scientificName: null, score: null,
    });
    expect(r.winner).toBe(llmA);
    expect(r.diverged).toBe(false);
  });

  it("returns winner untouched when score below 0.8 threshold (branch 2)", () => {
    const r = applyPlantnetOverride(llmA, llms, {
      success: true, scientificName: "monstera deliciosa", score: 0.7,
    });
    expect(r.winner).toBe(llmA);
    expect(r.diverged).toBe(false);
    expect(r.matchedLlm).toBeNull();
  });

  it("overrides scientific name when score >= 0.8 and winner matches exact (branch 3)", () => {
    const r = applyPlantnetOverride(llmA, llms, {
      success: true, scientificName: "monstera deliciosa", score: 0.95,
    });
    expect(r.winner.model).toBe("claude");
    expect(r.winner.scientificName).toBe("monstera deliciosa");
    expect(r.diverged).toBe(false);
    expect(r.matchedLlm).toBe("claude");
  });

  it("picks aligned LLM (not winner) when winner does not match but another does (branch 3-bis)", () => {
    // winner is llmC (ficus lyrata); plantnet says monstera → llmA matches
    const r = applyPlantnetOverride(llmC, llms, {
      success: true, scientificName: "monstera deliciosa", score: 0.92,
    });
    expect(r.winner.model).toBe("claude");
    expect(r.winner.scientificName).toBe("monstera deliciosa");
    expect(r.diverged).toBe(false);
    expect(r.matchedLlm).toBe("claude");
  });

  it("accepts normalized match (cultivar stripped)", () => {
    const winnerWithCultivar = { model: "gemini" as const, scientificName: "epipremnum aureum 'golden'" };
    const set = [llmA, winnerWithCultivar, llmC];
    const r = applyPlantnetOverride(winnerWithCultivar, set, {
      success: true, scientificName: "epipremnum aureum", score: 0.9,
    });
    expect(r.winner.model).toBe("gemini");
    expect(r.winner.scientificName).toBe("epipremnum aureum");
    expect(r.matchedLlm).toBe("gemini");
  });

  it("REJECTS genus-only match — falls through to divergence (D-11)", () => {
    // llmC = ficus lyrata; plantnet says ficus benjamina (same genus, different species)
    const r = applyPlantnetOverride(llmC, llms, {
      success: true, scientificName: "ficus benjamina", score: 0.9,
    });
    expect(r.winner).toBe(llmC);           // preserved
    expect(r.diverged).toBe(true);         // divergence recorded
    expect(r.matchedLlm).toBeNull();       // no valid match
  });

  it("marks diverged=true when score >= 0.8 and no LLM matches (branch 4)", () => {
    const r = applyPlantnetOverride(llmA, llms, {
      success: true, scientificName: "sansevieria trifasciata", score: 0.88,
    });
    expect(r.winner).toBe(llmA);
    expect(r.diverged).toBe(true);
    expect(r.matchedLlm).toBeNull();
  });

  it("uses threshold 0.8 exactly (score = 0.8 counts as >= threshold)", () => {
    const r = applyPlantnetOverride(llmA, llms, {
      success: true, scientificName: "monstera deliciosa", score: 0.8,
    });
    expect(r.matchedLlm).toBe("claude");   // 0.8 is inclusive
  });
});
