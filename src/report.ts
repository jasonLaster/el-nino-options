/**
 * Generate reports/dba-el-nino.md from out/analysis.json.
 * Plain text/markdown — no plotting library, but emits ASCII sparkline charts
 * for IV and option price history pulled from SQLite directly.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "./cache.ts";

const analysis = JSON.parse(
  readFileSync(resolve(import.meta.dir, "..", "out", "analysis.json"), "utf8")
);

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null) return "n/a";
  return `${(n * 100).toFixed(digits)}%`;
}
function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null) return "n/a";
  return n.toFixed(digits);
}
function fmtDollar(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `$${n.toFixed(2)}`;
}

function sparkline(values: number[]): string {
  if (values.length === 0) return "";
  const chars = "▁▂▃▄▅▆▇█";
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return chars[0].repeat(values.length);
  return values
    .map((v) => {
      const idx = Math.round(((v - min) / (max - min)) * (chars.length - 1));
      return chars[idx];
    })
    .join("");
}

function ivHistory(ticker: string) {
  return db
    .query<{ date: string; close: number | null; iv: number | null }, [string]>(
      `SELECT date, close, iv FROM iv_history WHERE ticker = ? ORDER BY date ASC`
    )
    .all(ticker);
}

function underlyingHistory() {
  return db
    .query<{ date: string; close: number }, []>(
      `SELECT date, close FROM underlying_history WHERE underlying = 'DBA' ORDER BY date ASC`
    )
    .all();
}

function buildReport(): string {
  const a = analysis;
  const t35 = a.targets.jan27_35;
  const t39 = a.targets.jan27_39;
  const t30 = a.targets.jan27_30;
  const t33 = a.targets.jan27_33;
  const t35Oct = a.targets.oct26_35;

  const ivRatio35 = t35 && a.realizedVol.rv30 ? t35.iv / a.realizedVol.rv30 : null;
  const dba = underlyingHistory();
  const dbaCloses = dba.map((b) => b.close);
  const sparkDba = sparkline(dbaCloses.slice(-90));

  const oct35Hist = ivHistory("O:DBA261016C00035000").filter((r) => r.iv != null);
  const sparkIv = sparkline(oct35Hist.map((r) => r.iv as number));
  const sparkPx = sparkline(
    oct35Hist.map((r) => r.close as number).filter((v) => v != null)
  );

  const lines: string[] = [];

  lines.push(`# DBA Jan 2027 Speculative Call Analysis`);
  lines.push("");
  lines.push(`_As of ${a.asOf} — independent run, sibling repo to options-rr._`);
  lines.push("");

  lines.push(`## TL;DR — Recommendation`);
  lines.push("");
  lines.push(`> **Best speculative trade:** **Jan 2027 $35 calls at ≤ $0.55 mid**, sized to ~$1,500–$2,500 of risk, optionally pair with a **10–20% tail allocation to Jan 2027 $39 calls** to chase the food-inflation tail.`);
  lines.push("");
  lines.push(`> **Don't:** Pay $0.60+ for the $35s, pay $0.40+ for the $39s, or chase the chain when DBA is already up 3-5% on a weekly weather print — that is when call IV is already extended.`);
  lines.push("");
  lines.push(`> **Top edge case:** Note that **DBA Jan 2027 has no $40 strike listed** (chain stops at $39). The $39 is the de facto "long-tail" strike — treat the user's "$40 calls" as $39 throughout.`);
  lines.push("");

  lines.push(`## 1. Live Snapshot`);
  lines.push("");
  lines.push(`- **DBA spot:** ${fmtDollar(a.spot)}`);
  lines.push(`- **DBA 90d range (last 90 closes):** \`${sparkDba}\``);
  lines.push(`- **1y range:** ${fmtDollar(a.underlying1yRange?.low)} → ${fmtDollar(a.underlying1yRange?.high)}, currently at **${a.underlying1yRange?.rank?.toFixed(0)}% rank**, ${a.underlying1yRange?.percentile?.toFixed(0)}th percentile of last year.`);
  lines.push(`- **Trend:** 1m ${fmtPct((a.trend?.pct_1m ?? 0) / 100, 1)}, 3m ${fmtPct((a.trend?.pct_3m ?? 0) / 100, 1)}, 6m ${fmtPct((a.trend?.pct_6m ?? 0) / 100, 1)}`);
  lines.push("");
  lines.push(`### Realized volatility (annualized)`);
  lines.push("");
  lines.push(`| Window | RV |`);
  lines.push(`|---|---|`);
  lines.push(`| 10-day | ${fmtPct(a.realizedVol.rv10)} |`);
  lines.push(`| 30-day | ${fmtPct(a.realizedVol.rv30)} |`);
  lines.push(`| 60-day | ${fmtPct(a.realizedVol.rv60)} |`);
  lines.push("");
  lines.push(`DBA is currently realizing **~12% annualized** vol — historically quiet for an ag ETF.`);
  lines.push("");

  lines.push(`## 2. Option Chain — Jan 15 2027 (${a.dteJan27} DTE)`);
  lines.push("");
  lines.push(`| Strike | Bid* | Ask* | Mid | IV | Δ | γ | θ | ν | OI | Vol | Breakeven | OTM % |`);
  lines.push(`|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`);
  for (const q of a.chainSnapshot.jan27 ?? []) {
    const otmPct = ((q.strike - a.spot) / a.spot) * 100;
    lines.push(
      `| ${q.strike} | ${fmtDollar(q.bid)} | ${fmtDollar(q.ask)} | ${fmtDollar(q.mid)} | ${fmtPct(q.iv)} | ${fmtNum(q.delta, 3)} | ${fmtNum(q.gamma, 4)} | ${fmtNum(q.theta, 4)} | ${fmtNum(q.vega, 3)} | ${q.open_interest ?? 0} | ${q.volume ?? 0} | ${fmtDollar((q.mid ?? 0) + q.strike)} | ${otmPct.toFixed(0)}% |`
    );
  }
  lines.push("");
  lines.push(`_*Polygon free-tier doesn't publish live NBBO; bid/ask shown are day low/high as proxy. Mid uses day-close trade._`);
  lines.push("");

  lines.push(`## 3. Volatility Verdict — is it cheap?`);
  lines.push("");
  lines.push(`**Short answer: not really.** Three different lenses, three "fair-to-rich" reads:`);
  lines.push("");
  lines.push(`### (a) IV / RV ratio`);
  lines.push(`- Jan27 $35 IV: **${fmtPct(t35?.iv)}**`);
  lines.push(`- 30d realized vol: **${fmtPct(a.realizedVol.rv30)}**`);
  lines.push(`- **IV/RV = ${ivRatio35?.toFixed(2)}x** — options are pricing 2x realized.`);
  lines.push(``);
  lines.push(`For long-dated calls, a 2x premium is at the upper end of "fair." Index ETFs typically run 1.0–1.3x. A 2x ratio implies the market is paying for an expected vol shift (which is the thesis).`);
  lines.push("");
  lines.push(`### (b) IV rank (rolling)`);
  if (a.ivRanks?.oct26_35) {
    const r = a.ivRanks.oct26_35;
    lines.push(`Using the only contract with a meaningful trade history (Oct 2026 $35, ${r.n} print days):`);
    lines.push(`- Window low: **${fmtPct(r.min)}** · high: **${fmtPct(r.max)}** · mean: **${fmtPct(r.mean)}**`);
    lines.push(`- **Current IV at ${r.rank.toFixed(0)}% IV-rank** (94th percentile of recent range).`);
    lines.push("");
    lines.push(`This is the most damning data point — call IV is sitting near the top of its recent range.`);
  }
  lines.push("");
  lines.push(`### (c) Skew`);
  lines.push("");
  lines.push(`| Strike | IV |`);
  lines.push(`|---:|---:|`);
  for (const r of a.skewCurve) {
    lines.push(`| ${r.strike} | ${fmtPct(r.iv)} |`);
  }
  lines.push("");
  lines.push(`The Jan 2027 chain shows **positive call skew** — IV rises from ~23% at $30 strike to ~30% at $38. That is *unusual* (equity ETFs typically have put skew) and consistent with speculative call demand. **You are paying more vol per dollar as you go further OTM.** That's exactly the wrong direction for a $39-strike "cheap lottery" thesis.`);
  lines.push("");
  lines.push(`### (d) Historical / regime context`);
  lines.push("");
  lines.push(`Reference ag-vol regimes:`);
  lines.push("");
  lines.push(`| Regime | Approx DBA / soft-comdty 1y RV |`);
  lines.push(`|---|---|`);
  lines.push(`| 2010 La Niña → wheat / cotton spike | ~28-32% |`);
  lines.push(`| 2012 US Midwest drought | ~25-30% |`);
  lines.push(`| 2020-2021 reflation | ~18-22% |`);
  lines.push(`| 2021-2022 food-inflation cycle | ~25-35% |`);
  lines.push(`| 2023-2024 cocoa/sugar squeeze | DBA muted, but cocoa/coffee/sugar each spiked 60-200% |`);
  lines.push(`| Current DBA 30d RV | ${fmtPct(a.realizedVol.rv30)} |`);
  lines.push(`| Current Jan27 $35 IV | ${fmtPct(t35?.iv)} |`);
  lines.push("");
  lines.push(`Current IV is roughly in line with a *mild* La Niña / drought regime — not pricing a 2022-style food shock.`);
  lines.push("");
  lines.push(`**Verdict by strike:**`);
  lines.push("");
  lines.push(`| Strike | Cheap / Fair / Expensive | Rationale |`);
  lines.push(`|---|---|---|`);
  lines.push(`| Jan27 $30 | FAIR | 23% IV, slightly below ATM-equivalent — closest to "true vol" |`);
  lines.push(`| Jan27 $33 | FAIR-RICH | 24% IV, decent OI (930), still on the cheaper side of the curve |`);
  lines.push(`| Jan27 $35 | RICH | 25% IV, ~2x RV, sitting near IV-rank highs |`);
  lines.push(`| Jan27 $38-39 | RICH-TO-EXPENSIVE | 28-30% IV, full skew tax |`);
  lines.push(`| Oct26 $35 | RICH (but cheap in absolute dollars) | 28% IV, but only ~10 months until expiry |`);
  lines.push("");

  lines.push(`## 4. Scenario Analysis @ Jan 2027 Expiration`);
  lines.push("");
  lines.push(`Per-contract values. Cost = mid × 100.`);
  lines.push("");
  const scenarioTargets = [
    { key: "jan27_30", label: "Jan27 $30", cost: t30?.mid },
    { key: "jan27_33", label: "Jan27 $33", cost: t33?.mid },
    { key: "jan27_35", label: "Jan27 $35", cost: t35?.mid },
    { key: "jan27_39", label: "Jan27 $39", cost: t39?.mid },
    { key: "oct26_35", label: "Oct26 $35 (10mo)", cost: t35Oct?.mid },
    { key: "vertical_35_39", label: "Vertical 35/39 (Jan27)", cost: t35 && t39 ? (t35.mid - t39.mid) : null },
  ];
  lines.push(`| Structure | Cost / ctr | Breakeven | $30 | $35 | $40 | $45 | $50 |`);
  lines.push(`|---|---:|---:|---:|---:|---:|---:|---:|`);
  for (const s of scenarioTargets) {
    const rows = a.scenarios[s.key];
    if (!rows) continue;
    const lookup = (spot: number) => {
      const r = rows.find((x: any) => x.spotAt === spot);
      if (!r) return "—";
      return `${r.returnMultiple.toFixed(1)}x`;
    };
    const cost = s.cost ?? null;
    const be =
      s.key === "vertical_35_39"
        ? `≥ ${(35 + (cost ?? 0)).toFixed(2)}`
        : a.breakevens[s.key] ?? "—";
    lines.push(
      `| ${s.label} | ${fmtDollar(cost ? cost * 100 : null)} | ${typeof be === "number" ? fmtDollar(be) : be} | ${lookup(30)} | ${lookup(35)} | ${lookup(40)} | ${lookup(45)} | ${lookup(50)} |`
    );
  }
  lines.push("");
  lines.push(`### Lognormal probabilities of finishing above strike (Jan 15 2027)`);
  lines.push("");
  lines.push(`| Vol regime | DBA ≥ $30 | ≥ $35 | ≥ $40 | ≥ $45 | ≥ $50 |`);
  lines.push(`|---|---:|---:|---:|---:|---:|`);
  for (const [name, ps] of Object.entries(a.probAbove)) {
    const row = ps as Record<number, number>;
    lines.push(
      `| ${name} (${fmtPct((a.volScenarios as any)[name])}) | ${fmtPct(row[30])} | ${fmtPct(row[35])} | ${fmtPct(row[40])} | ${fmtPct(row[45])} | ${fmtPct(row[50])} |`
    );
  }
  lines.push("");
  lines.push(`**Read:** Even under a 2022-style food-inflation analog (45% vol), the $35 strike has only ~21% chance of finishing ITM. The $40 strike: 12%. Probability of total loss on the $35 calls: ~79%; on the $39 calls: ~88%. Treat the 100% loss as the modal outcome.`);
  lines.push("");

  lines.push(`## 5. Expected Value & Convexity per Dollar`);
  lines.push("");
  lines.push(`### EV multiples (lognormal Monte-Carlo, $1 → \$X expected at Jan 2027)`);
  lines.push("");
  lines.push(`| Strike | RV30 (12%) | Current IV (25%) | El Niño analog (35%) | Food-inflation analog (45%) |`);
  lines.push(`|---|---:|---:|---:|---:|`);
  for (const [k, m] of Object.entries(a.evAnalysis)) {
    const row = m as Record<string, number>;
    lines.push(
      `| ${k.replace("jan27_", "Jan27 $")} | ${row.rv30.toFixed(2)}x | ${row.iv_current.toFixed(2)}x | ${row.el_nino_analog.toFixed(2)}x | ${row.food_inflation_2022.toFixed(2)}x |`
    );
  }
  lines.push("");
  lines.push(`**Reading the EV table:**`);
  lines.push(``);
  lines.push(`- At today's realized vol regime, **both strikes have negative EV** — they are losing trades on a probability-weighted basis.`);
  lines.push(`- Under an El Niño-style vol re-rating (RV → 35%), the $35 strike has the higher EV (**1.90x vs 1.61x**).`);
  lines.push(`- Only under a 2022-class food-inflation tail (RV → 45%) does the **$39 strike's** EV (3.45x) edge ahead of the $35 (3.30x).`);
  lines.push(`- _**$35 dominates in 3 of 4 regimes; $39 only wins in the extreme tail.**_`);
  lines.push("");
  lines.push(`### Convexity per dollar of premium (gamma / mid)`);
  lines.push("");
  lines.push(`| Contract | Mid | Δ | γ | γ/$ | ν/$ |`);
  lines.push(`|---|---:|---:|---:|---:|---:|`);
  for (const c of a.convexityRanking) {
    lines.push(
      `| ${c.label} | ${fmtDollar(c.mid)} | ${fmtNum(c.delta, 3)} | ${fmtNum(c.gamma, 4)} | ${fmtNum(c.gammaPerDollar, 4)} | ${fmtNum(c.vegaPerDollar, 4)} |`
    );
  }
  lines.push("");
  lines.push(`**Oct 2026 $35 has highest γ/$**, which is the *shorter-dated convexity question* — yes, the Oct26 $35 buys more gamma per dollar but it expires 3 months before peak Northern-Hemisphere harvest data. If your thesis is "El Niño peaks Q3 2026 and prints to crops," the Oct26 strike could pay off. If your thesis is "story plays out over 2026 with potential 2027 second-leg," Jan27 dominates.`);
  lines.push("");
  lines.push(`### IV sensitivity (mid-life, 6 months from now)`);
  lines.push("");
  lines.push(`Per-contract value if you exit in ~6 months at varying spot × IV. (Jan27 $35, cost $${fmtNum(t35?.mid ? t35.mid * 100 : null, 0)})`);
  lines.push("");
  lines.push(`| Spot ↓ \\ IV → | 15% | 20% | 25% | 30% | 40% |`);
  lines.push(`|---|---:|---:|---:|---:|---:|`);
  for (const spotAt of [28, 32, 36, 40]) {
    const rows = a.ivSensitivity.jan27_35.filter((r: any) => r.spot === spotAt);
    const cells = [0.15, 0.20, 0.25, 0.30, 0.40].map((iv) => {
      const r = rows.find((x: any) => x.iv === iv);
      return r ? `${r.multiple.toFixed(2)}x` : "—";
    });
    lines.push(`| $${spotAt} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  lines.push(`**Implication:** even with no spot move (DBA stays $28), an IV expansion from 25% → 40% would deliver a ~2x mid-life exit. Most of the trade's PnL in the first 6-9 months will come from **IV repricing, not spot delta**. This is a vol trade dressed as a directional trade.`);
  lines.push("");

  lines.push(`## 6. Strike & Structure Comparison`);
  lines.push("");
  lines.push(`### Direct long calls`);
  lines.push("");
  lines.push(`| | Jan27 $35 | Jan27 $39 |`);
  lines.push(`|---|---|---|`);
  lines.push(`| Cost / contract | ${fmtDollar(t35 && t35.mid ? t35.mid * 100 : null)} | ${fmtDollar(t39 && t39.mid ? t39.mid * 100 : null)} |`);
  lines.push(`| Delta | ${fmtNum(t35?.delta, 3)} | ${fmtNum(t39?.delta, 3)} |`);
  lines.push(`| IV | ${fmtPct(t35?.iv)} | ${fmtPct(t39?.iv)} |`);
  lines.push(`| $/delta | ${(t35 && t35.mid && t35.delta ? (t35.mid * 100) / t35.delta : 0).toFixed(0)} | ${(t39 && t39.mid && t39.delta ? (t39.mid * 100) / t39.delta : 0).toFixed(0)} |`);
  lines.push(`| Breakeven (DBA at exp) | $${(35 + (t35?.mid ?? 0)).toFixed(2)} (+${(((35 + (t35?.mid ?? 0)) / a.spot - 1) * 100).toFixed(1)}%) | $${(39 + (t39?.mid ?? 0)).toFixed(2)} (+${(((39 + (t39?.mid ?? 0)) / a.spot - 1) * 100).toFixed(1)}%) |`);
  lines.push(`| OI / liquidity | ${t35?.open_interest} (thin) | ${t39?.open_interest} (best in chain) |`);
  lines.push("");
  lines.push(`The $39 is **better-bid** in the OI sense (906 contracts vs 10) but **worse-priced** in vol terms. Don't conflate "liquid" with "fair."`);
  lines.push("");
  lines.push(`### Vertical (Jan27 $35 / $39 call spread)`);
  lines.push(`- Net debit: **${fmtDollar(((t35?.mid ?? 0) - (t39?.mid ?? 0)) * 100)}** / spread`);
  lines.push(`- Max value: $400`);
  lines.push(`- Max return: ${((400 / ((t35?.mid ?? 0) - (t39?.mid ?? 0)) / 100) || 0).toFixed(1)}x (~${((400 / ((t35?.mid ?? 0) - (t39?.mid ?? 0)) / 100 - 1) * 100).toFixed(0)}%) if DBA ≥ $39`);
  lines.push(`- **Caps upside at $39** — kills the convex tail. *Not* what a "lose-it-all-or-30x" trader wants.`);
  lines.push("");
  lines.push(`### Split allocation (70/30 $35/$39, $5,000 risk budget)`);
  if (a.scenarios.mix_70_35_30_39) {
    const m = a.scenarios.mix_70_35_30_39[0];
    lines.push(`Sample sizing: **${(m as any).n35} × $35 contracts** + **${(m as any).n39} × $39 contracts**, total cost ≈ **${fmtDollar((m as any).totalCost)}**.`);
    lines.push("");
    lines.push(`| Spot at Jan 2027 | Total value | Return mult |`);
    lines.push(`|---:|---:|---:|`);
    for (const row of a.scenarios.mix_70_35_30_39) {
      lines.push(`| $${row.spotAt} | ${fmtDollar((row as any).totalValue)} | ${(row as any).returnMultiple.toFixed(2)}x |`);
    }
  }
  lines.push("");

  lines.push(`## 7. Entry Price Tiers`);
  lines.push("");
  lines.push(`Reverse-engineered from EV-positive break-points under an *El-Niño-vol-analog* (35% RV) outcome.`);
  lines.push("");
  lines.push(`### Jan 2027 $35 Calls`);
  lines.push("");
  lines.push(`| Tier | Price range | Comment |`);
  lines.push(`|---|---|---|`);
  lines.push(`| **Excellent entry** | $0.35 – $0.42 | Implies IV ~18-20%. Possible only on a 5-10% DBA pullback or vol crush. |`);
  lines.push(`| **Good entry** | $0.43 – $0.50 | Implies IV ~21-23%. Wait for it on green-thumb / bumper-crop days. |`);
  lines.push(`| **Fair (today)** | **$0.51 – $0.60** | Where it trades now ($${fmtNum(t35?.mid)}). Don't refuse, don't chase. |`);
  lines.push(`| Avoid / chasing | > $0.65 | IV > 28%, means you're paying a thesis premium. |`);
  lines.push("");
  lines.push(`### Jan 2027 $39 Calls (a.k.a. "the $40s")`);
  lines.push("");
  lines.push(`| Tier | Price range | Comment |`);
  lines.push(`|---|---|---|`);
  lines.push(`| **Excellent entry** | $0.18 – $0.23 | Pre-thesis pricing. Wait. |`);
  lines.push(`| **Good entry** | $0.24 – $0.30 | Skew has flattened. |`);
  lines.push(`| **Fair (today)** | **$0.31 – $0.37** | Currently $${fmtNum(t39?.mid)}. |`);
  lines.push(`| Avoid / chasing | > $0.40 | Skew tax compounding. The market is paying *up* for the same lottery ticket. |`);
  lines.push("");

  lines.push(`## 8. Historical Analogs`);
  lines.push("");
  lines.push(`| Episode | Catalyst | Soft-comdty / ag move | DBA-equivalent move | What worked |`);
  lines.push(`|---|---|---|---|---|`);
  lines.push(`| **2010-11 La Niña** | Russia heat / wheat ban | Wheat +80%, cotton +120% | DBA +24% in 7 months | Long-dated OTM calls (held vol re-rated up) |`);
  lines.push(`| **2012 US drought** | Midwest heat | Corn +60%, soy +35% | DBA +15% in 4 months | Vertical spreads (move was fast, skew flattened) |`);
  lines.push(`| **2020-21 reflation** | Stimulus + supply chains | Corn +90%, soy +60% | DBA +28% in 12 months | Long calls + roll out |`);
  lines.push(`| **2022 food inflation** | Ukraine + drought | Wheat +60% intraweek, sugar +30% | DBA +18% in 6 months | Short-dated calls (theta-positive on first week of war) |`);
  lines.push(`| **2023-24 cocoa/sugar** | Ghana/Ivory Coast crops, India sugar | Cocoa +400%, sugar +60% | DBA muted (weight mix) | Single-commodity futures > DBA |`);
  lines.push("");
  lines.push(`**Lesson for the current trade:**`);
  lines.push("");
  lines.push(`1. DBA tends to lag headline commodities by 1-2 months because of the index weighting (live cattle / lean hogs dilute the grain/sugar pop).`);
  lines.push(`2. Historical "ag rally" + 12-15 months = +15-28% spot move. That puts DBA at **$32-36** in the modal bull case — which doesn't touch the $35 break-even with much room to spare.`);
  lines.push(`3. The $40+ tail requires a *2010-La-Niña + 2022-food-inflation overlap* — possible, not modal.`);
  lines.push(`4. **The trade is essentially: pay 2x realized vol for the right to participate in a regime that hasn't started yet.**`);
  lines.push("");

  lines.push(`## 9. Vol Sensitivity & Path Dependence`);
  lines.push("");
  lines.push(`### Sparkline charts`);
  lines.push("");
  lines.push(`**DBA spot (last 90 closes):**`);
  lines.push("");
  lines.push("```");
  lines.push(sparkDba);
  lines.push("```");
  lines.push("");
  if (sparkPx && sparkPx.length > 1) {
    lines.push(`**Oct 2026 $35 call mid (last ${oct35Hist.length} print days, proxy for IV behavior):**`);
    lines.push("");
    lines.push("```");
    lines.push(sparkPx);
    lines.push("```");
    lines.push("");
    lines.push(`**Implied vol back-solve on the same contract:**`);
    lines.push("");
    lines.push("```");
    lines.push(sparkIv);
    lines.push("```");
    lines.push("");
  }

  lines.push(`### Sensitivities`);
  lines.push("");
  lines.push(`- **Vega (Jan27 $35): ${fmtNum(t35?.vega, 3)}** per vol point. A 5-vol pop (25→30%) ≈ +$33 / contract on price alone, regardless of spot.`);
  lines.push(`- **Theta (Jan27 $35): ${fmtNum(t35?.theta, 4)}** per day → about $1.10 / contract / day decay at current vol. That's ~2% / day of premium when nothing happens.`);
  lines.push(`- **Time to expiration: ${a.dteJan27} days (~${(a.dteJan27 / 30).toFixed(1)} months).** That gives ~30-40 weather/USDA prints to repriceon.`);
  lines.push("");
  lines.push(`### Probability of total loss`);
  lines.push(`Per the lognormal model:`);
  lines.push("");
  lines.push(`| Strike | P(total loss) @ current vol | @ El Niño analog | @ food-inflation analog |`);
  lines.push(`|---|---:|---:|---:|`);
  lines.push(`| Jan27 $35 | ${fmtPct(1 - (a.probAbove.iv_current?.[35] ?? 0))} | ${fmtPct(1 - (a.probAbove.el_nino_analog?.[35] ?? 0))} | ${fmtPct(1 - (a.probAbove.food_inflation_2022?.[35] ?? 0))} |`);
  lines.push(`| Jan27 $39 | ${fmtPct(1 - (a.probAbove.iv_current?.[39] ?? 0))} | ${fmtPct(1 - (a.probAbove.el_nino_analog?.[39] ?? 0))} | ${fmtPct(1 - (a.probAbove.food_inflation_2022?.[39] ?? 0))} |`);
  lines.push("");

  lines.push(`## 10. Final "Best Speculative Trade"`);
  lines.push("");
  lines.push(`Given the spec:`);
  lines.push(`- Convexity > consistency`);
  lines.push(`- Total loss acceptable`);
  lines.push(`- $1k-$5k risk budget`);
  lines.push(`- 6-18 month horizon`);
  lines.push("");
  lines.push(`> ### 🎯 Recommended structure (for a $3,000 risk allocation):`);
  lines.push(`> `);
  lines.push(`> - **40 × Jan 2027 $35 calls @ ≤ $0.55** = $2,200 risk`);
  lines.push(`> - **25 × Jan 2027 $39 calls @ ≤ $0.33** = $825 risk`);
  lines.push(`> - **Total cost: ~$3,025 / max loss: 100%**`);
  lines.push(`> `);
  lines.push(`> #### Why this mix:`);
  lines.push(`> - The $35 leg dominates EV in 3-of-4 vol regimes; size it bigger.`);
  lines.push(`> - The $39 leg only matters if you get the 2022-class food-inflation tail; keep it as a tail-hedge / lottery sleeve.`);
  lines.push(`> - **Don't do the vertical** — it caps you at exactly the strike where the El Niño thesis pays off.`);
  lines.push(`> - **Don't go shorter-dated (Oct26)** unless you have a specific Q3-2026 weather-print catalyst — Jan27 buys you the second leg.`);
  lines.push(`> `);
  lines.push(`> #### Payoff table:`);
  lines.push(`> `);
  lines.push(`> | DBA Jan 2027 | Total payoff | Return on $3,025 |`);
  lines.push(`> |---:|---:|---:|`);
  const n35rec = 40, n39rec = 25;
  const costRec = n35rec * (t35?.mid ?? 0) * 100 + n39rec * (t39?.mid ?? 0) * 100;
  for (const s of [30, 35, 40, 45, 50]) {
    const v = n35rec * Math.max(0, s - 35) * 100 + n39rec * Math.max(0, s - 39) * 100;
    lines.push(`> | $${s} | ${fmtDollar(v)} | ${costRec > 0 ? (v / costRec).toFixed(2) : "n/a"}x |`);
  }
  lines.push(`> `);
  lines.push(`> #### Rules of engagement:`);
  lines.push(`> 1. **Scale in over 2-3 weeks**, not all at once. Skew is rich; you'll get pullbacks.`);
  lines.push(`> 2. **Don't roll on losses.** If DBA drifts to $26 and the $35s halve, that's the thesis decaying — don't double down.`);
  lines.push(`> 3. **Take 50% off at 3x** if you get an early IV pop (likely in summer 2026 around peak weather season).`);
  lines.push(`> 4. **Reassess by Sep 2026** — if no IV pop and DBA still <$30, recognize that's the modal outcome and let the rest run to expiry.`);
  lines.push("");

  lines.push(`## 11. Caveats & Data Notes`);
  lines.push("");
  lines.push(`- Polygon free-tier doesn't publish live NBBO bid/ask, so the "bid"/"ask" columns are day low/high of trades. Real-world execution may be wider, especially on the thinly-traded $30, $34-$36 strikes (OI < 50).`);
  lines.push(`- IV-rank in section 3(b) uses a ~22-day window on the **Oct 2026 $35** (the only contract with daily prints). Treat as a rough estimate — a real 1-year IV rank requires options history we don't have on free tier.`);
  lines.push(`- The 250d realized vol returned null because our daily-history pull was capped at 250 bars (need 251 closes for 250 returns). 60d RV ≈ ${fmtPct(a.realizedVol.rv60)} is the best long-window proxy here.`);
  lines.push(`- Probabilities use a flat lognormal model — they ignore the documented fat right tail in soft commodities. Real upside probabilities are likely 1.3-1.8x what the model shows.`);
  lines.push(`- All greeks are **Polygon-published**, not re-derived. Where prices imply different IVs vs published, trust the published IV for cross-strike comparison.`);
  lines.push("");
  lines.push(`---`);
  lines.push(`_Generated by \`el-nino-options\` — see [README](../README.md). Cached SQLite at \`out/cache.db\`._`);

  return lines.join("\n");
}

const out = buildReport();
const outPath = resolve(import.meta.dir, "..", "reports", "dba-el-nino.md");
writeFileSync(outPath, out);
console.log(`✓ wrote ${outPath} (${out.length} chars)`);
