/**
 * Fetch DBA option chain (Jan 2027, strikes 30-45), cache greeks in SQLite.
 * Also pulls 1-year underlying history and ATM contract IV history.
 */

import { db } from "./cache.ts";
import {
  listOptionContracts,
  getOptionSnapshot,
  getEquitySnapshot,
  getAggregates,
} from "./polygon.ts";

const UNDERLYING = "DBA";
const EXPIRATION = "2027-01-15";
const STRIKE_MIN = 30;
const STRIKE_MAX = 45;

async function main() {
  console.log(`Fetching ${UNDERLYING} chain for ${EXPIRATION}…`);

  let spot = await getEquitySnapshot(UNDERLYING);
  if (spot == null) {
    const today = new Date().toISOString().slice(0, 10);
    const fiveAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const bars = await getAggregates(UNDERLYING, fiveAgo, today);
    spot = bars.at(-1)?.c ?? null;
  }
  console.log(`  spot: ${spot}`);

  const contracts = await listOptionContracts(UNDERLYING, EXPIRATION, "call");
  const filtered = contracts.filter(
    (c) => c.strike_price >= STRIKE_MIN && c.strike_price <= STRIKE_MAX
  );
  console.log(`  ${filtered.length} call contracts in range ${STRIKE_MIN}-${STRIKE_MAX}`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO option_quotes
      (ticker, underlying, expiration, strike, contract_type, bid, ask, mid, last,
       iv, delta, gamma, theta, vega, open_interest, volume, underlying_price, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const fetchedAt = Date.now();
  let succeeded = 0;
  for (const c of filtered) {
    const snap = await getOptionSnapshot(UNDERLYING, c.ticker);
    if (!snap) continue;
    const q = snap.last_quote ?? {};
    const day = snap.day ?? {};
    const greeks = snap.greeks ?? {};
    // Free-tier Polygon: no live bid/ask. Use day.low/day.high as bid/ask proxy
    // and day.close (last trade) as the mark.
    const bid = q.bid ?? day.low ?? null;
    const ask = q.ask ?? day.high ?? null;
    const mid =
      q.midpoint ??
      (q.bid != null && q.ask != null ? (q.bid + q.ask) / 2 : null) ??
      day.close ??
      null;
    insert.run(
      c.ticker,
      UNDERLYING,
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
    process.stdout.write(
      `  ${c.strike_price.toString().padStart(4)} | bid ${(bid ?? 0).toFixed(2)}` +
        ` ask ${(ask ?? 0).toFixed(2)} mid ${(mid ?? 0).toFixed(2)}` +
        ` iv ${((snap.implied_volatility ?? 0) * 100).toFixed(1)}%` +
        ` Δ ${(greeks.delta ?? 0).toFixed(3)} OI ${snap.open_interest ?? 0}\n`
    );
  }
  console.log(`  ✓ snapshots cached: ${succeeded}/${filtered.length}`);

  console.log(`Fetching underlying history for ${UNDERLYING}…`);
  const today = new Date().toISOString().slice(0, 10);
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const aggs = await getAggregates(UNDERLYING, oneYearAgo, today);
  const insertHist = db.prepare(
    `INSERT OR REPLACE INTO underlying_history (underlying, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const a of aggs) {
    const date = new Date(a.t).toISOString().slice(0, 10);
    insertHist.run(UNDERLYING, date, a.o, a.h, a.l, a.c, a.v);
  }
  console.log(`  ${aggs.length} daily bars cached`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
