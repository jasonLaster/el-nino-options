/**
 * Pull 30-day price history for selected DBA option contracts.
 * Polygon aggregates on option tickers give us closing trade prices; combining
 * with a constant-vol back-solve gives us a rough IV time-series for each
 * contract.
 */

import { db } from "./cache.ts";
import { getAggregates } from "./polygon.ts";
import { impliedVol, daysToYears } from "./black-scholes.ts";

const UNDERLYING = "DBA";
const RFR = 0.043; // 1y risk-free proxy

const CONTRACTS = [
  // (ticker, strike, expiration)
  { ticker: "O:DBA270115C00035000", strike: 35, expiration: "2027-01-15" },
  { ticker: "O:DBA270115C00039000", strike: 39, expiration: "2027-01-15" },
  { ticker: "O:DBA270115C00033000", strike: 33, expiration: "2027-01-15" },
  { ticker: "O:DBA270115C00030000", strike: 30, expiration: "2027-01-15" },
  { ticker: "O:DBA261016C00035000", strike: 35, expiration: "2026-10-16" },
];

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000)
  );
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Pull DBA underlying for the same period
  const dbaBars = await getAggregates(UNDERLYING, from, today);
  const dbaByDate = new Map<string, number>();
  for (const b of dbaBars) {
    const d = new Date(b.t).toISOString().slice(0, 10);
    dbaByDate.set(d, b.c);
  }

  const insertIv = db.prepare(
    `INSERT OR REPLACE INTO iv_history (ticker, date, close, iv) VALUES (?, ?, ?, ?)`
  );

  for (const c of CONTRACTS) {
    console.log(`History for ${c.ticker}…`);
    const bars = await getAggregates(c.ticker, from, today);
    let inserted = 0;
    for (const b of bars) {
      const date = new Date(b.t).toISOString().slice(0, 10);
      const spot = dbaByDate.get(date);
      if (spot == null) continue;
      const dte = daysBetween(date, c.expiration);
      if (dte <= 0) continue;
      const T = daysToYears(dte);
      const iv = impliedVol(b.c, spot, c.strike, T, RFR, "CALL");
      insertIv.run(c.ticker, date, b.c, iv);
      inserted++;
    }
    console.log(`  ${inserted} days inserted from ${bars.length} bars`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
