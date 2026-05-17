/**
 * Bootstrap scripts/.benchmark-golden-set.json from candidate model_evaluations rows
 * using Pl@ntNet API as the source of ground truth.
 *
 * Why a separate bootstrap step:
 * The product owner is not a botanist and cannot reliably hand-label scientific names.
 * Pl@ntNet is a specialized plant-ID model (free tier 500 req/day) trained on millions
 * of expert-verified images — using it as the ground truth source is more reliable than
 * owner labels and the labels come back consistently formatted.
 *
 * Workflow:
 *   1. Run the sampling SQL in Supabase Studio (see scripts/.benchmark-golden-set.json `notes`)
 *   2. Save the result as a JSON array at scripts/.benchmark-candidates.json
 *      (each row: { plant_search_id, image_url, model_guess?, model?, created_at? })
 *   3. Get a free Pl@ntNet API key at https://my.plantnet.org/account/api
 *   4. PLANTNET_API_KEY=... npm run benchmark:bootstrap
 *
 * The script downloads each image, queries Pl@ntNet, and keeps the top-1 result if its
 * score >= SCORE_THRESHOLD. The owner reviews the resulting golden set before trusting it.
 *
 * Read-only: never writes to plant_searches or model_evaluations.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY;
if (!PLANTNET_API_KEY) {
  console.error("Missing PLANTNET_API_KEY env var");
  console.error("Get a free key at https://my.plantnet.org/account/api");
  process.exit(1);
}

const SCORE_THRESHOLD = 0.5;
const PROJECT = "all";
const PAUSE_MS = 1000;

const CANDIDATES_PATH = resolve(import.meta.dirname, ".benchmark-candidates.json");
const GOLDEN_SET_PATH = resolve(import.meta.dirname, ".benchmark-golden-set.json");

interface Candidate {
  plant_search_id: string;
  image_url: string;
  model_guess?: string;
  model?: string;
  created_at?: string;
}

interface PlantNetResult {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    commonNames?: string[];
  };
}

interface PlantNetResponse {
  bestMatch?: string;
  results: PlantNetResult[];
}

interface GoldenSetItem {
  id: string;
  imageUrl: string;
  groundTruth: {
    scientificName: string;
    commonNameEs?: string;
    notes?: string;
  };
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; mediaType: string; filename: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image ${res.status} for ${url}`);
  const mediaType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = url.split("/").pop()?.split("?")[0] ?? "image.jpg";
  return { buffer, mediaType, filename };
}

async function queryPlantNet(
  buffer: Buffer,
  mediaType: string,
  filename: string,
): Promise<PlantNetResponse> {
  const form = new FormData();
  const blob = new Blob([buffer], { type: mediaType });
  form.append("images", blob, filename);
  form.append("organs", "auto");

  const url = `https://my-api.plantnet.org/v2/identify/${PROJECT}?api-key=${PLANTNET_API_KEY}&nb-results=3`;
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pl@ntNet ${res.status}: ${text.substring(0, 200)}`);
  }
  return (await res.json()) as PlantNetResponse;
}

async function main() {
  let candidates: Candidate[];
  try {
    candidates = JSON.parse(readFileSync(CANDIDATES_PATH, "utf-8")) as Candidate[];
  } catch (e) {
    console.error(`Cannot read ${CANDIDATES_PATH}: ${(e as Error).message}`);
    console.error("Run the sampling SQL in Supabase Studio first, then save the result");
    console.error("as a JSON array at scripts/.benchmark-candidates.json");
    process.exit(1);
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    console.error("Candidates file is empty or not an array.");
    process.exit(1);
  }

  console.log(
    `Bootstrap: ${candidates.length} candidates → Pl@ntNet ` +
      `(project="${PROJECT}", threshold=${SCORE_THRESHOLD}, pause=${PAUSE_MS}ms)\n`,
  );

  const items: GoldenSetItem[] = [];
  let skippedLowScore = 0;
  let skippedError = 0;

  for (const [i, candidate] of candidates.entries()) {
    process.stdout.write(`[${i + 1}/${candidates.length}] ${candidate.plant_search_id.substring(0, 8)} ... `);
    try {
      const { buffer, mediaType, filename } = await downloadImage(candidate.image_url);
      const resp = await queryPlantNet(buffer, mediaType, filename);
      const top = resp.results[0];
      if (!top) {
        console.log("SKIP (no results)");
        skippedError++;
      } else if (top.score < SCORE_THRESHOLD) {
        console.log(`SKIP (top score ${top.score.toFixed(2)} < ${SCORE_THRESHOLD})`);
        skippedLowScore++;
      } else {
        const id = String(items.length + 1).padStart(2, "0");
        items.push({
          id,
          imageUrl: candidate.image_url,
          groundTruth: {
            scientificName: top.species.scientificNameWithoutAuthor,
            notes: `Pl@ntNet score ${top.score.toFixed(2)} (model_guess: ${candidate.model_guess ?? "n/a"})`,
          },
        });
        console.log(
          `KEEP ${top.species.scientificNameWithoutAuthor} (score ${top.score.toFixed(2)})`,
        );
      }
    } catch (e) {
      console.log(`SKIP (${(e as Error).message})`);
      skippedError++;
    }
    if (i < candidates.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  let goldenSet: { version: number; createdAt: string; notes: string; items: GoldenSetItem[]; bootstrappedAt?: string };
  try {
    goldenSet = JSON.parse(readFileSync(GOLDEN_SET_PATH, "utf-8"));
  } catch {
    goldenSet = {
      version: 1,
      createdAt: new Date().toISOString().split("T")[0],
      notes: "",
      items: [],
    };
  }
  goldenSet.items = items;
  goldenSet.bootstrappedAt = new Date().toISOString();
  goldenSet.notes =
    `Bootstrapped via Pl@ntNet on ${new Date().toISOString().split("T")[0]} — ` +
    `${items.length}/${candidates.length} kept (threshold ${SCORE_THRESHOLD}). ` +
    "Review individual entries before trusting metrics. " +
    "Source: scripts/bootstrap-golden-set.ts";

  writeFileSync(GOLDEN_SET_PATH, JSON.stringify(goldenSet, null, 2) + "\n");

  console.log("\n─── REPORT ─────────────────────────────");
  console.log(`  Kept:                ${items.length}`);
  console.log(`  Skipped (low score): ${skippedLowScore}`);
  console.log(`  Skipped (errors):    ${skippedError}`);
  console.log(`  Total candidates:    ${candidates.length}`);
  console.log(`\nGolden set written to: ${GOLDEN_SET_PATH}`);
  console.log("Review the items, then run: npm run benchmark:prompt");
}

main().catch((err) => {
  console.error("bootstrap-golden-set failed:", err.message);
  process.exit(1);
});
