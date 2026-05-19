/**
 * Cross-ticker strategy synthesis.
 *
 * Reads multi_quotes and computes per ticker:
 *   - Spot, ATM IV (proxy), delta-band targets (0.10, 0.20, 0.30)
 *   - $ per delta efficiency (cost / |delta|)
 *   - γ/$, ν/$ at each band
 *   - Liquidity (OI, volume)
 * Then ranks across the basket for:
 *   - Best convex long (call side: fertilizer + soft commodity)
 *   - Best defined-risk short (put side: food retailers)
 * And emits a budget-allocated "ideal strategy" with specific strikes.
 */

import { db } from "./cache.ts";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface Row {
  ticker: string;
  underlying: string;
  side: "calls" | "puts";
  tier: string;
  expiration: string;
  strike: number;
  contract_type: string;
  mid: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  open_interest: number | null;
  volume: number | null;
  underlying_price: number | null;
}

// Use per-ticker latest snapshot (each ticker has its own fetched_at)
const rows: Row[] = db
  .query<Row, []>(
    `WITH latest AS (
       SELECT underlying, MAX(fetched_at) AS fa FROM multi_quotes GROUP BY underlying
     )
     SELECT mq.ticker, mq.underlying, mq.side, mq.tier, mq.expiration, mq.strike, mq.contract_type,
            mq.mid, mq.iv, mq.delta, mq.gamma, mq.theta, mq.vega,
            mq.open_interest, mq.volume, mq.underlying_price
     FROM multi_quotes mq
     JOIN latest ON mq.underlying = latest.underlying AND mq.fetched_at = latest.fa
     ORDER BY mq.underlying ASC, mq.strike ASC`
  )
  .all();

// Group by underlying
const byUnderlying = new Map<string, Row[]>();
for (const r of rows) {
  if (!byUnderlying.has(r.underlying)) byUnderlying.set(r.underlying, []);
  byUnderlying.get(r.underlying)!.push(r);
}

interface BandPick {
  band: "0.10" | "0.20" | "0.30";
  row: Row | null;
  costPerContract: number | null;
  dollarPerDelta: number | null;
  gammaPerDollar: number | null;
  vegaPerDollar: number | null;
}

function pickBand(rows: Row[], targetDelta: number): BandPick {
  // Pick the row whose |delta| is closest to targetDelta, given mid + delta are present
  const usable = rows.filter(
    (r) => r.delta != null && r.mid != null && r.mid > 0
  );
  if (usable.length === 0)
    return {
      band:
        targetDelta === 0.1 ? "0.10" : targetDelta === 0.2 ? "0.20" : "0.30",
      row: null,
      costPerContract: null,
      dollarPerDelta: null,
      gammaPerDollar: null,
      vegaPerDollar: null,
    };
  const best = usable.reduce((a, b) =>
    Math.abs(Math.abs(b.delta!) - targetDelta) <
    Math.abs(Math.abs(a.delta!) - targetDelta)
      ? b
      : a
  );
  return {
    band:
      targetDelta === 0.1 ? "0.10" : targetDelta === 0.2 ? "0.20" : "0.30",
    row: best,
    costPerContract: best.mid! * 100,
    dollarPerDelta: (best.mid! * 100) / Math.abs(best.delta!),
    gammaPerDollar: best.gamma != null ? best.gamma / best.mid! : null,
    vegaPerDollar: best.vega != null ? best.vega / best.mid! : null,
  };
}

interface UnderlyingSummary {
  underlying: string;
  side: "calls" | "puts";
  tier: string;
  spot: number;
  atmIv: number | null;
  picks: {
    "0.10": BandPick;
    "0.20": BandPick;
    "0.30": BandPick;
  };
  liquidityScore: number; // 0-1 based on OI weight
}

const summaries: UnderlyingSummary[] = [];
for (const [underlying, urows] of byUnderlying.entries()) {
  if (urows.length === 0) continue;
  const spot = urows[0].underlying_price ?? 0;
  // ATM IV proxy: average IV of the two strikes closest to spot
  const ivAtmCandidates = urows
    .filter((r) => r.iv != null)
    .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))
    .slice(0, 2);
  const atmIv =
    ivAtmCandidates.length > 0
      ? ivAtmCandidates.reduce((a, b) => a + b.iv!, 0) / ivAtmCandidates.length
      : null;
  const pick10 = pickBand(urows, 0.1);
  const pick20 = pickBand(urows, 0.2);
  const pick30 = pickBand(urows, 0.3);
  // Liquidity score: sum of OI in the OTM region capped
  const totalOI = urows.reduce((a, b) => a + (b.open_interest ?? 0), 0);
  summaries.push({
    underlying,
    side: urows[0].side,
    tier: urows[0].tier,
    spot,
    atmIv,
    picks: { "0.10": pick10, "0.20": pick20, "0.30": pick30 },
    liquidityScore: Math.min(1, totalOI / 5000),
  });
}

// Rank: cheapest $/delta at 0.20 band per side
const calls = summaries
  .filter((s) => s.side === "calls" && s.picks["0.20"].dollarPerDelta != null)
  .sort(
    (a, b) =>
      (a.picks["0.20"].dollarPerDelta ?? Infinity) -
      (b.picks["0.20"].dollarPerDelta ?? Infinity)
  );

const puts = summaries
  .filter((s) => s.side === "puts" && s.picks["0.20"].dollarPerDelta != null)
  .sort(
    (a, b) =>
      (a.picks["0.20"].dollarPerDelta ?? Infinity) -
      (b.picks["0.20"].dollarPerDelta ?? Infinity)
  );

const payload = { generated_at: Date.now(), summaries, ranking: { calls, puts } };
const outPath = resolve(import.meta.dir, "..", "out", "strategy.json");
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`✓ wrote ${outPath}`);

// Console output: pretty table
function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

function row(s: UnderlyingSummary, band: "0.10" | "0.20" | "0.30"): string {
  const p = s.picks[band];
  if (!p.row) return "";
  return [
    s.underlying.padEnd(5),
    s.side.padEnd(5),
    s.tier.replace("tier_", "T").replace("_", " ").padEnd(18),
    `$${fmt(s.spot)}`.padStart(8),
    `${fmt(s.atmIv ? s.atmIv * 100 : null, 1)}%`.padStart(6),
    `K=${fmt(p.row.strike, 1)}`.padStart(8),
    `Δ=${fmt(p.row.delta, 3)}`.padStart(10),
    `$${fmt(p.row.mid, 2)}`.padStart(7),
    `$/Δ=${fmt(p.dollarPerDelta, 0)}`.padStart(10),
    `γ/$=${fmt(p.gammaPerDollar, 3)}`.padStart(12),
    `OI=${p.row.open_interest ?? 0}`.padStart(8),
  ].join(" ");
}

console.log("\n=== CALLS — ranked by cheapest $/delta at 0.20 band ===");
for (const s of calls) console.log(row(s, "0.20"));

console.log("\n=== PUTS — ranked by cheapest $/delta at 0.20 band ===");
for (const s of puts) console.log(row(s, "0.20"));

console.log("\n=== ALL bands per underlying ===");
for (const s of summaries) {
  console.log(`\n${s.underlying}  ${s.side}  spot $${fmt(s.spot)}  ATM IV ${fmt(s.atmIv ? s.atmIv * 100 : null, 1)}%  liq ${fmt(s.liquidityScore, 2)}`);
  for (const band of ["0.10", "0.20", "0.30"] as const) {
    const p = s.picks[band];
    if (!p.row) { console.log(`  ${band}: —`); continue; }
    console.log(`  ${band}: K=${fmt(p.row.strike, 1).padStart(7)}  Δ=${fmt(p.row.delta, 3)}  mid=$${fmt(p.row.mid, 2)}  $/Δ=$${fmt(p.dollarPerDelta, 0)}  γ/$=${fmt(p.gammaPerDollar, 3)}  OI=${p.row.open_interest ?? 0}`);
  }
}
