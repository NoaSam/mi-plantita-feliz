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

      if (a.raw === b.raw) {
        bestTier = "exact";
        break; // Can't do better
      }

      if (bestTier !== "normalized" && a.normalized === b.normalized && a.normalized !== "") {
        bestTier = "normalized";
      }

      if (bestTier === null && a.genus !== null && a.genus === b.genus) {
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
