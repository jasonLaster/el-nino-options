/**
 * Core analysis driver.
 * Reads cached snapshots + history from SQLite, computes:
 *   - realized vol (10d, 30d, 60d, 250d)
 *   - IV vs RV gap
 *   - skew curve across strikes
 *   - scenario PnL at expiration for $30/35/40/45/50 spot
 *   - convexity-per-dollar by strike
 *   - vertical spreads and split allocations
 *   - sensitivity to IV compression/expansion (mid-life valuation)
 * Writes structured JSON to out/analysis.json for the report step.
 */

import { db } from "./cache.ts";
import { bsPrice, daysToYears } from "./black-scholes.ts";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const UNDERLYING = "DBA";
const RFR = 0.043;
const TODAY = new Date().toISOString().slice(0, 10);
const EXP_JAN27 = "2027-01-15";
const EXP_OCT26 = "2026-10-16";

function dteFrom(today: string, exp: string): number {
  return Math.round(
    (new Date(exp).getTime() - new Date(today).getTime()) / (24 * 60 * 60 * 1000)
  );
}

interface Quote {
  ticker: string;
  strike: number;
  expiration: string;
  bid: number | null;
  ask: number | null;
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

function latestQuotes(expiration: string): Quote[] {
  return db
    .query<Quote, [string]>(
      `SELECT ticker, strike, expiration, bid, ask, mid, iv, delta, gamma, theta, vega,
              open_interest, volume, underlying_price
       FROM option_quotes
       WHERE expiration = ?
       AND fetched_at = (SELECT MAX(fetched_at) FROM option_quotes WHERE expiration = ?)
       ORDER BY strike ASC`
    )
    .all(expiration, expiration);
}

interface Bar {
  date: string;
  close: number;
}

function dailyHistory(): Bar[] {
  return db
    .query<Bar, []>(
      `SELECT date, close FROM underlying_history WHERE underlying = '${UNDERLYING}' ORDER BY date ASC`
    )
    .all();
}

function realizedVol(closes: number[], window: number): number | null {
  if (closes.length < window + 1) return null;
  const recent = closes.slice(-window - 1);
  const rets: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    rets.push(Math.log(recent[i] / recent[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance * 252);
}

function rangeRank(closes: number[], window: number): {
  rank: number; percentile: number; low: number; high: number; current: number;
} | null {
  if (closes.length < 20) return null;
  const window_data = closes.slice(-window);
  const sorted = [...window_data].sort((a, b) => a - b);
  const current = closes[closes.length - 1];
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const rank = high === low ? 0 : ((current - low) / (high - low)) * 100;
  // percentile: % of values <= current
  const below = window_data.filter((v) => v <= current).length;
  const percentile = (below / window_data.length) * 100;
  return { rank, percentile, low, high, current };
}

function pctChange(closes: number[], days: number): number | null {
  if (closes.length <= days) return null;
  const recent = closes[closes.length - 1];
  const past = closes[closes.length - 1 - days];
  return ((recent - past) / past) * 100;
}

interface ScenarioResult {
  strike: number;
  spotAt: number;
  optionValue: number;
  costPerContract: number;
  pnlPerContract: number;
  returnMultiple: number;
  pctReturn: number;
}

function scenario(
  strike: number,
  cost: number,
  spotAtExp: number
): ScenarioResult {
  const value = Math.max(0, spotAtExp - strike) * 100;
  const costPerContract = cost * 100;
  const pnl = value - costPerContract;
  return {
    strike,
    spotAt: spotAtExp,
    optionValue: value,
    costPerContract,
    pnlPerContract: pnl,
    returnMultiple: costPerContract > 0 ? value / costPerContract : 0,
    pctReturn: costPerContract > 0 ? (pnl / costPerContract) * 100 : 0,
  };
}

// Normal CDF for ATM probability estimates
function normCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function lognormalProbAbove(spot: number, target: number, vol: number, T: number): number {
  if (spot <= 0 || target <= 0 || vol <= 0 || T <= 0) return 0;
  const drift = -0.5 * vol * vol * T; // risk-neutral drift = 0 for simplicity (no rf for probability cone)
  const z = (Math.log(target / spot) - drift) / (vol * Math.sqrt(T));
  return 1 - normCDF(z);
}

function main() {
  const jan27 = latestQuotes(EXP_JAN27);
  const oct26 = latestQuotes(EXP_OCT26);
  const history = dailyHistory();
  const closes = history.map((b) => b.close);
  const spot = jan27[0]?.underlying_price ?? closes.at(-1) ?? 0;

  const rv = {
    rv10: realizedVol(closes, 10),
    rv30: realizedVol(closes, 30),
    rv60: realizedVol(closes, 60),
    rv250: realizedVol(closes, 250),
  };
  const range1y = rangeRank(closes, Math.min(closes.length, 252));
  const trend = {
    pct_1m: pctChange(closes, 21),
    pct_3m: pctChange(closes, 63),
    pct_6m: pctChange(closes, 126),
    pct_12m: pctChange(closes, 250),
  };

  // Skew: IV by strike, slope of OTM call IVs
  const skewRows = jan27
    .filter((q) => q.iv != null && q.strike >= spot)
    .map((q) => ({ strike: q.strike, iv: q.iv as number, delta: q.delta }));

  // Compute IV rank for the ATM/OTM contracts using IV history we have
  const ivHist = (ticker: string) =>
    db
      .query<{ date: string; iv: number | null }, [string]>(
        `SELECT date, iv FROM iv_history WHERE ticker = ? ORDER BY date ASC`
      )
      .all(ticker);

  function ivRank(ticker: string): {
    n: number; min: number; max: number; current: number; rank: number; mean: number;
  } | null {
    const rows = ivHist(ticker).filter((r) => r.iv != null);
    if (rows.length < 3) return null;
    const ivs = rows.map((r) => r.iv as number);
    const min = Math.min(...ivs);
    const max = Math.max(...ivs);
    const current = ivs[ivs.length - 1];
    const rank = max === min ? 0 : ((current - min) / (max - min)) * 100;
    const mean = ivs.reduce((a, b) => a + b, 0) / ivs.length;
    return { n: ivs.length, min, max, current, rank, mean };
  }

  // Targets: Jan 27 $35 and $39 (proxy for $40)
  const target35 = jan27.find((q) => q.strike === 35);
  const target39 = jan27.find((q) => q.strike === 39);
  const target33 = jan27.find((q) => q.strike === 33);
  const target30 = jan27.find((q) => q.strike === 30);
  const target35Oct = oct26.find((q) => q.strike === 35);

  // Scenario PnL at expiration
  const spotScenarios = [30, 35, 40, 45, 50];
  const scenarios: Record<string, ScenarioResult[]> = {};
  for (const q of [target30, target33, target35, target39].filter(Boolean) as Quote[]) {
    if (q.mid == null) continue;
    scenarios[`jan27_${q.strike}`] = spotScenarios.map((s) => scenario(q.strike, q.mid as number, s));
  }
  if (target35Oct?.mid != null) {
    scenarios.oct26_35 = spotScenarios.map((s) => scenario(35, target35Oct.mid as number, s));
  }

  // Verticals: 35/39 call spread
  if (target35?.mid != null && target39?.mid != null) {
    const netDebit = (target35.mid as number) - (target39.mid as number);
    const maxValueAt = 39 - 35; // $4 wide
    scenarios.vertical_35_39 = spotScenarios.map((s) => {
      const valueAt = Math.max(0, Math.min(s, 39) - 35) * 100;
      const cost = netDebit * 100;
      return {
        strike: 35,
        spotAt: s,
        optionValue: valueAt,
        costPerContract: cost,
        pnlPerContract: valueAt - cost,
        returnMultiple: cost > 0 ? valueAt / cost : 0,
        pctReturn: cost > 0 ? ((valueAt - cost) / cost) * 100 : 0,
      };
    });
  }

  // Split allocation: 70% $35 / 30% $39, $5,000 budget
  const budget = 5000;
  if (target35?.mid != null && target39?.mid != null) {
    const cost35 = (target35.mid as number) * 100;
    const cost39 = (target39.mid as number) * 100;
    const alloc35 = budget * 0.7;
    const alloc39 = budget * 0.3;
    const n35 = Math.floor(alloc35 / cost35);
    const n39 = Math.floor(alloc39 / cost39);
    const totalCost = n35 * cost35 + n39 * cost39;
    const mixScenarios = spotScenarios.map((s) => {
      const v35 = n35 * Math.max(0, s - 35) * 100;
      const v39 = n39 * Math.max(0, s - 39) * 100;
      const total = v35 + v39;
      return {
        spotAt: s,
        n35,
        n39,
        totalCost,
        totalValue: total,
        pnl: total - totalCost,
        returnMultiple: totalCost > 0 ? total / totalCost : 0,
        pctReturn: totalCost > 0 ? ((total - totalCost) / totalCost) * 100 : 0,
      };
    });
    scenarios.mix_70_35_30_39 = mixScenarios as unknown as ScenarioResult[];
  }

  // Convexity per dollar: gamma / cost
  function convexity(q: Quote | undefined): number | null {
    if (!q || q.gamma == null || q.mid == null || q.mid === 0) return null;
    return q.gamma / q.mid;
  }

  const convexityRanking = [target30, target33, target35, target39, target35Oct]
    .filter(Boolean)
    .map((q) => ({
      label:
        q!.expiration === EXP_OCT26
          ? `Oct26 $${q!.strike}`
          : `Jan27 $${q!.strike}`,
      strike: q!.strike,
      mid: q!.mid,
      delta: q!.delta,
      gamma: q!.gamma,
      iv: q!.iv,
      gammaPerDollar: convexity(q),
      vegaPerDollar: q!.vega && q!.mid ? q!.vega / q!.mid : null,
    }))
    .sort((a, b) => (b.gammaPerDollar ?? 0) - (a.gammaPerDollar ?? 0));

  // Probability of finishing ITM under different vol regimes
  // Use 30d RV, current IV, and historical analog (35% — 2022 grain spike level)
  const dteJan27 = dteFrom(TODAY, EXP_JAN27);
  const T = daysToYears(dteJan27);
  const volScenarios = {
    rv30: rv.rv30 ?? 0.18,
    iv_current: target35?.iv ?? 0.25,
    el_nino_analog: 0.35,
    food_inflation_2022: 0.45,
  };
  const probAbove: Record<string, Record<number, number>> = {};
  for (const [name, vol] of Object.entries(volScenarios)) {
    probAbove[name] = {};
    for (const tgt of [30, 33, 35, 39, 40, 45, 50]) {
      probAbove[name][tgt] = lognormalProbAbove(spot, tgt, vol, T);
    }
  }

  // EV under each vol regime (Jan27 $35)
  function expectedValue(strike: number, cost: number, vol: number, T: number): number {
    // Discrete integration over spot outcomes (lognormal)
    let ev = 0;
    let totalP = 0;
    const N = 200;
    for (let i = 1; i <= N; i++) {
      const lo = (i - 1) / N;
      const hi = i / N;
      // Take midpoint of bin as the spot for that probability mass
      const pMid = (lo + hi) / 2;
      // Inverse normal of pMid
      const z = invNorm(pMid);
      const drift = -0.5 * vol * vol * T;
      const futureSpot = spot * Math.exp(drift + vol * Math.sqrt(T) * z);
      const payoff = Math.max(0, futureSpot - strike);
      const p = 1 / N;
      ev += payoff * p;
      totalP += p;
    }
    const evDollars = ev * 100;
    const costDollars = cost * 100;
    return evDollars / costDollars; // return multiple under that vol
  }

  // Approximate inverse normal (Acklam)
  function invNorm(p: number): number {
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969,
               138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887,
               66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184,
               -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143,
               3.75440866190742];
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q: number, r: number;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
    if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
             (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }

  const evAnalysis: Record<string, Record<string, number>> = {};
  for (const q of [target35, target39].filter(Boolean) as Quote[]) {
    if (q.mid == null) continue;
    evAnalysis[`jan27_${q.strike}`] = {};
    for (const [name, vol] of Object.entries(volScenarios)) {
      evAnalysis[`jan27_${q.strike}`][name] = expectedValue(q.strike, q.mid as number, vol, T);
    }
  }

  // IV compression/expansion sensitivity: revalue contracts 6mo from now at varying IV
  const T6 = daysToYears(dteJan27 - 180);
  function midLifeValue(strike: number, vol: number, spotAt: number): number {
    return bsPrice(spotAt, strike, T6, RFR, vol, "CALL") * 100;
  }
  const ivSensitivity: Record<string, Array<{spot: number; iv: number; value: number; multiple: number}>> = {};
  for (const q of [target35, target39].filter(Boolean) as Quote[]) {
    if (q.mid == null) continue;
    const cost = (q.mid as number) * 100;
    const rows: Array<{spot: number; iv: number; value: number; multiple: number}> = [];
    for (const spotAt of [28, 32, 36, 40]) {
      for (const iv of [0.15, 0.20, 0.25, 0.30, 0.40]) {
        const v = midLifeValue(q.strike, iv, spotAt);
        rows.push({ spot: spotAt, iv, value: v, multiple: v / cost });
      }
    }
    ivSensitivity[`jan27_${q.strike}`] = rows;
  }

  // Break-even prices
  const breakevens: Record<string, number> = {};
  for (const q of [target30, target33, target35, target39].filter(Boolean) as Quote[]) {
    if (q.mid != null) breakevens[`jan27_${q.strike}`] = q.strike + (q.mid as number);
  }
  if (target35Oct?.mid != null) breakevens.oct26_35 = 35 + (target35Oct.mid as number);

  const ivRanks = {
    jan27_35: target35 ? ivRank(target35.ticker) : null,
    jan27_39: target39 ? ivRank(target39.ticker) : null,
    oct26_35: target35Oct ? ivRank(target35Oct.ticker) : null,
  };

  // Assemble report payload
  const payload = {
    asOf: TODAY,
    underlying: UNDERLYING,
    spot,
    realizedVol: rv,
    underlying1yRange: range1y,
    trend,
    skewCurve: skewRows,
    chainSnapshot: { jan27, oct26 },
    ivRanks,
    targets: {
      jan27_35: target35,
      jan27_39: target39,
      jan27_33: target33,
      jan27_30: target30,
      oct26_35: target35Oct,
    },
    breakevens,
    scenarios,
    convexityRanking,
    probAbove,
    evAnalysis,
    ivSensitivity,
    volScenarios,
    dteJan27,
  };

  const outPath = resolve(import.meta.dir, "..", "out", "analysis.json");
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`✓ wrote ${outPath}`);

  // Brief console summary
  console.log("\n=== SUMMARY ===");
  console.log(`DBA spot: $${spot?.toFixed(2)}`);
  console.log(`RV: 10d ${(rv.rv10! * 100).toFixed(1)}%  30d ${(rv.rv30! * 100).toFixed(1)}%  250d ${(rv.rv250! * 100).toFixed(1)}%`);
  if (target35) console.log(`Jan27 $35: mid $${target35.mid?.toFixed(2)} IV ${(target35.iv! * 100).toFixed(1)}% Δ${target35.delta?.toFixed(3)} OI ${target35.open_interest}`);
  if (target39) console.log(`Jan27 $39: mid $${target39.mid?.toFixed(2)} IV ${(target39.iv! * 100).toFixed(1)}% Δ${target39.delta?.toFixed(3)} OI ${target39.open_interest}`);
  if (target35Oct) console.log(`Oct26 $35: mid $${target35Oct.mid?.toFixed(2)} IV ${(target35Oct.iv! * 100).toFixed(1)}% Δ${target35Oct.delta?.toFixed(3)} OI ${target35Oct.open_interest}`);
}

main();
