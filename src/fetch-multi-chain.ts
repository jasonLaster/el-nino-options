/**
 * Pull option chains for the cross-thesis target basket using the Massive API
 * bulk snapshot endpoint (one call per ticker → entire chain with greeks).
 *
 * Targets organized by tier (matches el-nino-deep-dive § 7-revised):
 *   tier_2_fertilizer: long calls — MOS, CF, NTR
 *   tier_3_food_margin: long puts — HSY, MDLZ, CPB, GIS
 *   tier_1_soft_commodity_etfs: long calls — JO (coffee), CANE (sugar), SOYB, WEAT, CORN
 *   tier_5_redeploy: long calls — DE, CTVA, BG, ADM
 */

import { db } from "./cache.ts";
import {
  getOptionsChainSnapshot,
  getEquityLastPrice,
  getAggregatesMassive,
} from "./massive.ts";

interface Target {
  ticker: string;
  side: "calls" | "puts";
  tier: string;
  thesis: string;
}

const TARGETS: Target[] = [
  // Fertilizer equity calls
  { ticker: "MOS", side: "calls", tier: "tier_2_fertilizer", thesis: "Phosphate + potash beta" },
  { ticker: "CF", side: "calls", tier: "tier_2_fertilizer", thesis: "Pure-play nitrogen/urea" },
  { ticker: "NTR", side: "calls", tier: "tier_2_fertilizer", thesis: "Diversified all-nutrient" },
  // Food-margin compression puts
  { ticker: "HSY", side: "puts", tier: "tier_3_food_margin", thesis: "Cocoa margin compression" },
  { ticker: "MDLZ", side: "puts", tier: "tier_3_food_margin", thesis: "Cocoa + sugar + wheat" },
  { ticker: "GIS", side: "puts", tier: "tier_3_food_margin", thesis: "Cereal + wheat + sugar" },
  { ticker: "CPB", side: "puts", tier: "tier_3_food_margin", thesis: "Soup + wheat" },
  // Soft commodity ETFs
  { ticker: "JO", side: "calls", tier: "tier_1_soft_commodity", thesis: "Coffee (Vietnam/Brazil)" },
  { ticker: "CANE", side: "calls", tier: "tier_1_soft_commodity", thesis: "Sugar #11" },
  { ticker: "SOYB", side: "calls", tier: "tier_1_soft_commodity", thesis: "Soybean (palm proxy)" },
  { ticker: "WEAT", side: "calls", tier: "tier_1_soft_commodity", thesis: "Wheat (post-WASDE)" },
  { ticker: "CORN", side: "calls", tier: "tier_1_soft_commodity", thesis: "Corn (WASDE area+yield cut)" },
  // Post-payoff redeploy (will fetch for completeness)
  { ticker: "DE", side: "calls", tier: "tier_5_redeploy", thesis: "Farm equipment" },
  { ticker: "CTVA", side: "calls", tier: "tier_5_redeploy", thesis: "Seeds + crop chem" },
  { ticker: "BG", side: "calls", tier: "tier_5_redeploy", thesis: "Oilseeds processor" },
  { ticker: "ADM", side: "calls", tier: "tier_5_redeploy", thesis: "Grain processor" },
];

const EXPIRATION = "2027-01-15";

// Extend schema if not present (idempotent)
db.exec(`
  CREATE TABLE IF NOT EXISTS multi_quotes (
    ticker TEXT NOT NULL,
    underlying TEXT NOT NULL,
    side TEXT NOT NULL,
    tier TEXT NOT NULL,
    expiration TEXT NOT NULL,
    strike REAL NOT NULL,
    contract_type TEXT NOT NULL,
    bid REAL, ask REAL, mid REAL, last REAL,
    iv REAL, delta REAL, gamma REAL, theta REAL, vega REAL,
    open_interest INTEGER, volume INTEGER,
    underlying_price REAL,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY (ticker, fetched_at)
  );
`);

async function fetchOne(t: Target): Promise<void> {
  console.log(`\n=== ${t.ticker} (${t.side}, ${t.tier}) ===`);

  // 1. Spot price
  let spot = await getEquityLastPrice(t.ticker);
  if (spot == null) {
    const today = new Date().toISOString().slice(0, 10);
    const fiveAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const bars = await getAggregatesMassive(t.ticker, fiveAgo, today);
    spot = bars.at(-1)?.c ?? null;
  }
  if (spot == null) {
    console.warn(`  ✗ skip — no spot price`);
    return;
  }
  console.log(`  spot: $${spot}`);

  // 2. Bulk chain snapshot — one call returns full chain w/ greeks
  const contractType = t.side === "calls" ? "call" : "put";
  const strikeMin = t.side === "calls" ? spot * 0.9 : spot * 0.5;
  const strikeMax = t.side === "calls" ? spot * 1.6 : spot * 1.1;
  const chain = await getOptionsChainSnapshot(t.ticker, {
    expiration: EXPIRATION,
    contractType,
    strikeMin,
    strikeMax,
    limit: 250,
  });
  console.log(`  ${chain.length} contracts in chain (filtered ${strikeMin.toFixed(0)}-${strikeMax.toFixed(0)})`);

  // 3. Insert each contract into multi_quotes
  const insert = db.prepare(
    `INSERT OR REPLACE INTO multi_quotes
      (ticker, underlying, side, tier, expiration, strike, contract_type, bid, ask, mid, last,
       iv, delta, gamma, theta, vega, open_interest, volume, underlying_price, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const fetchedAt = Date.now();
  let succeeded = 0;
  for (const c of chain) {
    const details = c.details;
    if (!details?.ticker || details.strike_price == null) continue;
    const q = c.last_quote ?? {};
    const day = c.day ?? {};
    const greeks = c.greeks ?? {};
    const bid = q.bid ?? day.low ?? null;
    const ask = q.ask ?? day.high ?? null;
    const mid =
      q.midpoint ??
      (q.bid != null && q.ask != null ? (q.bid + q.ask) / 2 : null) ??
      day.close ??
      null;
    insert.run(
      details.ticker,
      t.ticker,
      t.side,
      t.tier,
      details.expiration_date ?? EXPIRATION,
      details.strike_price,
      details.contract_type ?? contractType,
      bid,
      ask,
      mid,
      c.last_trade?.price ?? day.close ?? null,
      c.implied_volatility ?? null,
      greeks.delta ?? null,
      greeks.gamma ?? null,
      greeks.theta ?? null,
      greeks.vega ?? null,
      c.open_interest ?? null,
      day.volume ?? null,
      c.underlying_asset?.price ?? spot,
      fetchedAt
    );
    succeeded++;
  }
  console.log(`  ✓ ${succeeded} contracts cached`);
}

async function main() {
  for (const target of TARGETS) {
    try {
      await fetchOne(target);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ✗ ${target.ticker} failed: ${msg.slice(0, 150)}`);
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
