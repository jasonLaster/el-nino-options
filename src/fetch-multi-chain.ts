/**
 * Pull option chains for the cross-thesis target basket.
 *
 * Targets organized by tier (matches el-nino-deep-dive § 7-revised):
 *   tier_2_fertilizer: long calls — MOS, CF, NTR
 *   tier_3_food_margin: long puts — HSY, MDLZ, CPB, GIS
 *   tier_1_soft_commodity_etfs: long calls — JO (coffee), CANE (sugar), SOYB (palm proxy)
 *   tier_5_redeploy: long calls (post-payoff entry) — DE, CTVA, BG
 *
 * For each ticker we cache:
 *   - spot
 *   - 1-year underlying history (for RV)
 *   - Jan 2027 chain (full strike range around 0.05-0.35 delta)
 */

import { db } from "./cache.ts";
import {
  listOptionContracts,
  getOptionSnapshot,
  getEquitySnapshot,
  getAggregates,
} from "./polygon.ts";

interface Target {
  ticker: string;
  side: "calls" | "puts";
  tier: string;
  thesis: string;
}

const TARGETS: Target[] = [
  // Fertilizer equity calls
  { ticker: "MOS", side: "calls", tier: "tier_2_fertilizer", thesis: "Phosphate + potash beta to ag price spike + 2026/27 demand" },
  { ticker: "CF", side: "calls", tier: "tier_2_fertilizer", thesis: "Pure-play nitrogen/urea; direct Hormuz beneficiary" },
  { ticker: "NTR", side: "calls", tier: "tier_2_fertilizer", thesis: "Diversified all-nutrient fertilizer + retail" },

  // Food-margin compression puts
  { ticker: "HSY", side: "puts", tier: "tier_3_food_margin", thesis: "Cocoa-driven margin compression Round 2" },
  { ticker: "MDLZ", side: "puts", tier: "tier_3_food_margin", thesis: "Cocoa + sugar + wheat input compression" },
  { ticker: "GIS", side: "puts", tier: "tier_3_food_margin", thesis: "Cereal + wheat + sugar input compression" },
  { ticker: "CPB", side: "puts", tier: "tier_3_food_margin", thesis: "Soup/snacks + wheat input compression" },

  // Soft commodity ETFs/ETNs as cleaner-than-DBA proxies
  { ticker: "JO", side: "calls", tier: "tier_1_soft_commodity", thesis: "Coffee (mostly Arabica) — Vietnam/Brazil drought sensitivity" },
  { ticker: "CANE", side: "calls", tier: "tier_1_soft_commodity", thesis: "Sugar #11 — Brazil center-south + India monsoon" },
  { ticker: "SOYB", side: "calls", tier: "tier_1_soft_commodity", thesis: "Soybean — palm oil substitute proxy" },
  { ticker: "WEAT", side: "calls", tier: "tier_1_soft_commodity", thesis: "Wheat — already moved post-WASDE; check residual convexity" },
  { ticker: "CORN", side: "calls", tier: "tier_1_soft_commodity", thesis: "Corn — US area + yield cut from WASDE" },

  // Post-payoff redeploy (for completeness; we may not size into these yet)
  { ticker: "DE", side: "calls", tier: "tier_5_redeploy", thesis: "Farm equipment — operating leverage to farm income" },
  { ticker: "CTVA", side: "calls", tier: "tier_5_redeploy", thesis: "Corteva seeds + crop protection" },
  { ticker: "BG", side: "calls", tier: "tier_5_redeploy", thesis: "Bunge oilseeds processor — palm/soy crush margin" },
];

const EXPIRATION = "2027-01-15";

interface MultiQuoteRow {
  ticker: string;
  underlying: string;
  side: "calls" | "puts";
  tier: string;
  expiration: string;
  strike: number;
  contract_type: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  last: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  open_interest: number | null;
  volume: number | null;
  underlying_price: number | null;
  fetched_at: number;
}

// Extend schema to include side + tier
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

  // 1. Spot
  let spot = await getEquitySnapshot(t.ticker);
  if (spot == null) {
    const today = new Date().toISOString().slice(0, 10);
    const fiveAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const bars = await getAggregates(t.ticker, fiveAgo, today);
    spot = bars.at(-1)?.c ?? null;
  }
  console.log(`  spot: ${spot}`);
  if (spot == null) {
    console.warn(`  ✗ skip — no spot price`);
    return;
  }

  // 2. Skipping underlying history (rate-limit-heavy on free tier).
  //    Compute RV from cached data later or use ATM IV as the only vol input.

  // 3. Options chain — both contract types if we wanted, but we know which side we want
  const contractType = t.side === "calls" ? "call" : "put";
  const contracts = await listOptionContracts(t.ticker, EXPIRATION, contractType);
  console.log(`  ${contracts.length} total ${contractType} contracts at ${EXPIRATION}`);

  // Filter to interesting strike range: 10% ITM to 50% OTM for calls, 50% OTM to 10% ITM for puts
  const filtered = contracts.filter((c) => {
    if (t.side === "calls") {
      return c.strike_price >= spot * 0.9 && c.strike_price <= spot * 1.5;
    } else {
      return c.strike_price <= spot * 1.1 && c.strike_price >= spot * 0.5;
    }
  });
  console.log(`  ${filtered.length} contracts in OTM range`);

  // Snapshot each
  const insert = db.prepare(
    `INSERT OR REPLACE INTO multi_quotes
      (ticker, underlying, side, tier, expiration, strike, contract_type, bid, ask, mid, last,
       iv, delta, gamma, theta, vega, open_interest, volume, underlying_price, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const fetchedAt = Date.now();
  let succeeded = 0;
  for (const c of filtered) {
    const snap = await getOptionSnapshot(t.ticker, c.ticker);
    if (!snap) continue;
    const q = snap.last_quote ?? {};
    const day = snap.day ?? {};
    const greeks = snap.greeks ?? {};
    const bid = q.bid ?? day.low ?? null;
    const ask = q.ask ?? day.high ?? null;
    const mid =
      q.midpoint ??
      (q.bid != null && q.ask != null ? (q.bid + q.ask) / 2 : null) ??
      day.close ??
      null;
    insert.run(
      c.ticker,
      t.ticker,
      t.side,
      t.tier,
      c.expiration_date,
      c.strike_price,
      c.contract_type,
      bid,
      ask,
      mid,
      snap.last_trade?.price ?? day.close ?? null,
      snap.implied_volatility ?? null,
      greeks.delta ?? null,
      greeks.gamma ?? null,
      greeks.theta ?? null,
      greeks.vega ?? null,
      snap.open_interest ?? null,
      day.volume ?? null,
      snap.underlying_asset?.price ?? spot ?? null,
      fetchedAt
    );
    succeeded++;
  }
  console.log(`  ✓ snapshots: ${succeeded}/${filtered.length}`);
}

async function main() {
  for (const target of TARGETS) {
    try {
      await fetchOne(target);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ✗ ${target.ticker} failed: ${msg.slice(0, 100)}`);
      // After a failure, wait an extra 30 sec to let any rate limit cool down
      await Bun.sleep(30_000);
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
