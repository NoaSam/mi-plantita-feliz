// ─── consensus.ts ─────────────────────────────────────────────────────────────
// Pure functions for scientific name extraction, normalization, and consensus.
// No Deno globals, no external imports — works in both Deno and Node/Vitest.

export type ModelName = "claude" | "gemini" | "gpt4o";
export type ConsensusVerdict = "correct" | "no_consensus";
export type ConsensusMatchLevel = "exact" | "normalized" | "genus";

export interface ModelInput {
  model: ModelName;
  success: boolean;
  scientificName: string | null;
}

export interface ConsensusResult {
  verdict: ConsensusVerdict;
  matchLevel: ConsensusMatchLevel | null;
}

// ─── Name extraction ───────────────────────────────────────────────────────────

/**
 * Extracts the scientific name from the model's "name" field.
 * Expected format: "Nombre común (Nombre científico)"
 *
 * Handles: multiple parenthesized segments, cultivars inside parens,
 * genus-only names like "(Phalaenopsis)".
 * Returns null when no valid scientific name is found.
 */
export function extractScientificName(name: string): string | null {
  const segments: string[] = [];
  const re = /\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(name)) !== null) {
    segments.push(m[1].trim());
  }

  if (segments.length === 0) return null;

  // Prefer the first segment that looks like a binomial: starts uppercase, has a space
  for (const seg of segments) {
    if (/^[A-Z][a-z]/.test(seg) && /\s/.test(seg)) {
      return seg.toLowerCase();
    }
  }

  // Fallback: genus-only (single uppercase word like "Phalaenopsis")
  if (/^[A-Z]/.test(segments[0])) {
    return segments[0].toLowerCase();
  }

  return null;
}

// ─── Name normalization ────────────────────────────────────────────────────────

/**
 * Normalizes a scientific name for fuzzy comparison.
 * Input must be already lowercased.
 *
 * Strips: cultivars, hybrid markers, infraspecific ranks, spp. placeholder.
 * Collapses whitespace.
 * Regexes are inline to avoid stale lastIndex issues with module-level /g patterns.
 */
export function normalizeScientificName(name: string): string {
  return name
    .replace(/\s*'[^']+'/g, "")                          // cultivar names
    .replace(/(?:^|\s)[×x]\s+(?=[a-z])/gi, " ")          // hybrid markers
    .replace(/\s+(?:var|subsp|ssp|f|fo|cv)\.\s+\S+/gi, "") // infraspecific ranks
    .replace(/\s+spp\.?\s*/gi, "")                        // spp. placeholder
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts the genus (first word) from a scientific name.
 */
export function extractGenus(normalized: string): string | null {
  const genus = normalized.split(" ")[0];
  return genus && genus.length > 1 ? genus : null;
}

// ─── Scientific name matching (D-11) ──────────────────────────────────────────

/**
 * Compares two lowercased scientific names and returns the best match tier
 * (exact > normalized > genus), or null if no match at any tier.
 *
 * - "exact": string equality after lowercase (input assumed already lowercased)
 * - "normalized": equality after stripping cultivars, hybrid markers,
 *   infraspecific ranks (spp/var/subsp/f/cv). Uses normalizeScientificName().
 * - "genus": same first word (genus) but different species/lower ranks.
 *
 * Returns null when either input is null/empty or when normalized/genus
 * comparison would compare against empty strings.
 *
 * Used by:
 *  - computeConsensus (LLM ↔ LLM matching, all 3 tiers count)
 *  - applyPlantnetOverride (PlantNet ↔ LLM matching, only exact + normalized
 *    count per Phase 5 D-11; genus is intentionally rejected because within
 *    the same genus care instructions can differ meaningfully — e.g.
 *    Ficus lyrata vs Ficus benjamina).
 */
export function matchScientific(
  a: string | null,
  b: string | null,
): ConsensusMatchLevel | null {
  if (!a || !b) return null;

  if (a === b) return "exact";

  const na = normalizeScientificName(a);
  const nb = normalizeScientificName(b);
  if (na !== "" && na === nb) return "normalized";

  const ga = extractGenus(na);
  const gb = extractGenus(nb);
  if (ga !== null && ga === gb) return "genus";

  return null;
}

// ─── Consensus computation ────────────────────────────────────────────────────

/**
 * Determines consensus using tiered name matching:
 *   1. Exact match (identical lowercased strings)
 *   2. Normalized match (after stripping cultivars, hybrids, infraspecific ranks)
 *   3. Genus match (same first word)
 *
 * A model is "correct" if its name matches at least one other successful model
 * at any tier. The highest tier achieved is stored as matchLevel.
 */
export function computeConsensus(
  results: ModelInput[]
): Map<ModelName, ConsensusResult> {
  const output = new Map<ModelName, ConsensusResult>();
  const successful = results.filter((r) => r.success && r.scientificName !== null);

  // Need at least 2 successful results to form any consensus
  if (successful.length < 2) {
    for (const r of results) {
      output.set(r.model, { verdict: "no_consensus", matchLevel: null });
    }
    return output;
  }

  // Pre-compute normalized and genus forms
  const enriched = successful.map((r) => {
    const normalized = normalizeScientificName(r.scientificName!);
    return {
      model: r.model,
      raw: r.scientificName!,
      normalized,
      genus: extractGenus(normalized),
    };
  });

  // For each successful model, find its best match tier against any other
  const matchResults = new Map<ModelName, ConsensusMatchLevel | null>();

  for (const a of enriched) {
    let bestTier: ConsensusMatchLevel | null = null;

    for (const b of enriched) {
      if (a.model === b.model) continue;

      const tier = matchScientific(a.raw, b.raw);
      if (tier === null) continue;

      // Rank: exact > normalized > genus
      if (tier === "exact") {
        bestTier = "exact";
        break;
      }
      if (tier === "normalized" && bestTier !== "exact") {
        bestTier = "normalized";
      } else if (tier === "genus" && bestTier === null) {
        bestTier = "genus";
      }
    }

    matchResults.set(a.model, bestTier);
  }

  // Build output
  for (const r of results) {
    if (!r.success || r.scientificName === null) {
      output.set(r.model, { verdict: "no_consensus", matchLevel: null });
      continue;
    }

    const tier = matchResults.get(r.model) ?? null;
    if (tier !== null) {
      output.set(r.model, { verdict: "correct", matchLevel: tier });
    } else {
      output.set(r.model, { verdict: "no_consensus", matchLevel: null });
    }
  }

  return output;
}

// ─── PlantNet cross-validation override (Phase 5 D-01) ────────────────────────

export const PLANTNET_OVERRIDE_SCORE_THRESHOLD = 0.8;  // D-10

export interface PlantnetOverrideInput {
  success: boolean;
  scientificName: string | null;   // lowercased scientificNameWithoutAuthor
  score: number | null;            // 0..1
}

/**
 * Minimal shape needed from an LLM result for the override to work.
 * We deliberately do NOT depend on the edge function's ModelResult type
 * (which lives in index.ts and has non-portable fields like plantInfo).
 * The edge function passes objects that satisfy this shape.
 */
export interface LlmWinnerInput {
  model: ModelName;
  scientificName: string | null;
}

export interface PlantnetOverrideResult<T extends LlmWinnerInput = LlmWinnerInput> {
  /** The final winner. Same identity as `llmWinner` OR a different LLM's row
   *  (from `llmResults`), with `scientificName` potentially replaced by
   *  PlantNet's canonical name in override cases. */
  winner: T;
  /** True only when score >= threshold AND no LLM matched (branch 4). */
  diverged: boolean;
  /** The model name of the LLM PlantNet aligned with, if any (branch 3). */
  matchedLlm: ModelName | null;
}

/**
 * Applies PlantNet's vote as an override layer on top of the LLM consensus.
 * See Phase 5 CONTEXT.md D-01 for the full decision tree.
 *
 * Rules (D-01 branches):
 *   1. PlantNet failed / null / no score → return llmWinner untouched (D-09).
 *   2. score < 0.8 → return llmWinner untouched (below the override threshold).
 *   3. score >= 0.8 AND at least one LLM matches (via matchScientific at
 *      'exact' or 'normalized' tier — genus NOT allowed per D-11) → return
 *      the matched LLM with its scientificName replaced by PlantNet's.
 *      If multiple LLMs match, prefer llmWinner itself; otherwise the first
 *      matching LLM in llmResults.
 *   4. score >= 0.8 AND no LLM matches → return llmWinner untouched but
 *      mark diverged=true so the caller can flag plant_searches.plantnet_diverged
 *      and dispatch the PostHog event (D-12).
 *
 * Pure function — no side effects. Testable in isolation.
 *
 * D-11: only 'exact' and 'normalized' tiers count as a match here. The 'genus'
 * tier is intentionally rejected because within the same genus care instructions
 * can differ meaningfully (e.g. Ficus lyrata vs Ficus benjamina). Accepting a
 * genus match would break the coherence guarantee between the displayed
 * scientific name and the LLM-provided care fields.
 */
export function applyPlantnetOverride<T extends LlmWinnerInput>(
  llmWinner: T,
  llmResults: T[],
  plantnetResult: PlantnetOverrideInput | null,
): PlantnetOverrideResult<T> {
  // Branch 1: PlantNet unavailable
  if (
    plantnetResult === null ||
    !plantnetResult.success ||
    plantnetResult.scientificName === null ||
    plantnetResult.score === null ||
    !Number.isFinite(plantnetResult.score)
  ) {
    return { winner: llmWinner, diverged: false, matchedLlm: null };
  }

  // Branch 2: below threshold
  if (plantnetResult.score < PLANTNET_OVERRIDE_SCORE_THRESHOLD) {
    return { winner: llmWinner, diverged: false, matchedLlm: null };
  }

  // Branches 3 / 3-bis / 4: threshold met, look for a valid match
  const plantnetSci = plantnetResult.scientificName;

  const isValidMatch = (llmSci: string | null): boolean => {
    const tier = matchScientific(llmSci, plantnetSci);
    // D-11: only exact or normalized count; genus does not.
    return tier === "exact" || tier === "normalized";
  };

  // Prefer llmWinner if it matches
  if (isValidMatch(llmWinner.scientificName)) {
    return {
      winner: { ...llmWinner, scientificName: plantnetSci },
      diverged: false,
      matchedLlm: llmWinner.model,
    };
  }

  // Otherwise pick the first LLM (in input order) that matches
  const alignedLlm = llmResults.find((r) => r !== llmWinner && isValidMatch(r.scientificName));
  if (alignedLlm) {
    return {
      winner: { ...alignedLlm, scientificName: plantnetSci },
      diverged: false,
      matchedLlm: alignedLlm.model,
    };
  }

  // Branch 4: no valid match → preserve LLM winner, mark divergence
  return { winner: llmWinner, diverged: true, matchedLlm: null };
}
