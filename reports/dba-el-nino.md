# DBA Jan 2027 Speculative Call Analysis

_As of 2026-05-18 — independent run, sibling repo to options-rr._

> ## ⚠️ Update — 2026-05-18 reading after live signals confirmed
>
> The primary sources flagged in the companion [el-nino-deep-dive.md](el-nino-deep-dive.md) all printed since first draft:
>
> - **NOAA CPC (May 14):** El Niño Watch · 96% probability for DJF 2026-27
> - **IMD (Apr 13):** Indian monsoon **below normal at 92% LPA** — *the trigger pulled*
> - **USDA WASDE (May 12):** Wheat -18% YoY ending stocks; wheat **limit-up on release**
> - **IRI plumes (Apr 20):** Subsurface Niño 1+2 at +1.8°C — load gun cocked
> - **MPOB (Apr 2026):** Stocks rising despite expected El Niño concerns — *yield signal hasn't hit palm yet*
>
> **What this changes for the DBA trade:**
>
> 1. **The El Niño thesis is now consensus, not speculation.** Much of the "cheap" convexity has already compressed in the obvious markets (wheat).
> 2. **DBA's 25% IV at the $35 strike re-reads as 'fair' rather than 'rich.'** It reflects the new state of knowledge, not over-bidding. The IV-rank framing (94th percentile of a 22d window) overstates richness because that window predates the IMD and WASDE prints.
> 3. **The convex tail still lives outside DBA** — in tropical perennials (cocoa, coffee, palm oil) and single-stock fertilizer / food-margin plays. DBA is too grain-heavy; grains have largely moved.
> 4. **The DBA structure remains directionally right but with shorter half-life.** Enter on weakness, don't average, take 50% off at 3x, reassess by Sep 2026. The June 11-12 NOAA + WASDE prints are the next inflection.
>
> See [el-nino-deep-dive.md § 7-revised](el-nino-deep-dive.md#7-revised--what-changes-now-that-the-thesis-is-consensus) for the updated trade architecture across the whole opportunity set.
>
> ### 🎯 Sequel: cross-ticker scan in [ideal-strategy.md](ideal-strategy.md)
>
> A cross-ticker option-chain scan (via the Massive API bulk snapshot endpoint, 16 names) found two legs that dominate DBA on a $/Δ basis:
>
> - **CANE Jan27 $13 calls** @ $0.50 → $/Δ = $177, γ/$ = 0.206 (best in scan)
> - **WEAT Jan27 $35 calls** @ $0.69 → $/Δ = $351, **OI = 40,490** (deepest liquidity)
>
> Both are dramatically cheaper convexity than DBA $35 calls ($/Δ ≈ $318). The 7-leg ideal basket built around them is a strictly better Ackman-style construction than the DBA-only play.
>
> **If you want simplicity** → stay with the DBA $35 recommendation below.
> **If you want the highest-asymmetry trade** → execute the [ideal-strategy.md](ideal-strategy.md) basket.

## TL;DR — Recommendation

> **Best speculative trade:** **Jan 2027 $35 calls at ≤ $0.55 mid**, sized to ~$1,500–$2,500 of risk, optionally pair with a **10–20% tail allocation to Jan 2027 $39 calls** to chase the food-inflation tail.

> **Don't:** Pay $0.60+ for the $35s, pay $0.40+ for the $39s, or chase the chain when DBA is already up 3-5% on a weekly weather print — that is when call IV is already extended.

> **Top edge case:** Note that **DBA Jan 2027 has no $40 strike listed** (chain stops at $39). The $39 is the de facto "long-tail" strike — treat the user's "$40 calls" as $39 throughout.

## 1. Live Snapshot

- **DBA spot:** $27.83
- **DBA 90d range (last 90 closes):** `▂▂▂▁▁▁▁▁▁▁▁▂▂▂▂▂▁▁▂▁▂▂▂▂▂▂▂▁▂▂▂▂▂▂▂▂▂▂▂▃▄▃▃▄▄▄▃▃▄▄▄▄▄▄▅▅▅▅▄▅▅▄▄▄▄▄▅▅▅▄▄▅▅▅▅▅▆▇▆▇▇▇▇▆▆▇██▇▆`
- **1y range:** $25.44 → $28.73, currently at **73% rank**, 95th percentile of last year.
- **Trend:** 1m 2.7%, 3m 7.9%, 6m 5.4%

### Realized volatility (annualized)

| Window | RV |
|---|---|
| 10-day | 17.2% |
| 30-day | 12.3% |
| 60-day | 10.4% |

DBA is currently realizing **~12% annualized** vol — historically quiet for an ag ETF.

## 2. Option Chain — Jan 15 2027 (242 DTE)

| Strike | Bid* | Ask* | Mid | IV | Δ | γ | θ | ν | OI | Vol | Breakeven | OTM % |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 30 | $1.40 | $1.60 | $1.60 | 23.0% | 0.410 | 0.0737 | -0.0043 | 0.092 | 11 | 86 | $31.60 | 8% |
| 31 | $1.15 | $1.20 | $1.15 | 23.0% | 0.345 | 0.0696 | -0.0040 | 0.082 | 230 | 12 | $32.15 | 11% |
| 32 | $0.93 | $1.05 | $0.93 | 24.9% | 0.305 | 0.0610 | -0.0041 | 0.083 | 222 | 3 | $32.93 | 15% |
| 33 | $0.76 | $0.86 | $0.76 | 24.3% | 0.246 | 0.0567 | -0.0037 | 0.065 | 930 | 115 | $33.76 | 19% |
| 34 | $0.62 | $0.65 | $0.63 | 22.9% | 0.185 | 0.0507 | -0.0029 | 0.066 | 18 | 18 | $34.63 | 22% |
| 35 | $0.55 | $0.80 | $0.55 | 25.2% | 0.173 | 0.0442 | -0.0031 | 0.067 | 10 | 36 | $35.55 | 26% |
| 36 | $0.37 | $0.37 | $0.37 | 27.1% | 0.158 | 0.0392 | -0.0032 | 0.068 | 10 | 10 | $36.37 | 29% |
| 37 | n/a | n/a | n/a | 27.9% | 0.141 | 0.0349 | -0.0030 | 0.046 | 0 | 0 | $37.00 | 33% |
| 38 | n/a | n/a | n/a | 29.6% | 0.134 | 0.0317 | -0.0030 | 0.046 | 0 | 0 | $38.00 | 37% |
| 39 | $0.31 | $0.33 | $0.33 | 27.6% | 0.091 | 0.0259 | -0.0022 | 0.047 | 906 | 142 | $39.33 | 40% |

_*Polygon free-tier doesn't publish live NBBO; bid/ask shown are day low/high as proxy. Mid uses day-close trade._

## 3. Volatility Verdict — is it cheap?

**Short answer: not really.** Three different lenses, three "fair-to-rich" reads:

### (a) IV / RV ratio
- Jan27 $35 IV: **25.2%**
- 30d realized vol: **12.3%**
- **IV/RV = 2.05x** — options are pricing 2x realized.

For long-dated calls, a 2x premium is at the upper end of "fair." Index ETFs typically run 1.0–1.3x. A 2x ratio implies the market is paying for an expected vol shift (which is the thesis).

### (b) IV rank (rolling)
Using the only contract with a meaningful trade history (Oct 2026 $35, 22 print days):
- Window low: **23.4%** · high: **28.5%** · mean: **25.3%**
- **Current IV at 94% IV-rank** (94th percentile of recent range).

This is the most damning data point — call IV is sitting near the top of its recent range.

### (c) Skew

| Strike | IV |
|---:|---:|
| 30 | 23.0% |
| 31 | 23.0% |
| 32 | 24.9% |
| 33 | 24.3% |
| 34 | 22.9% |
| 35 | 25.2% |
| 36 | 27.1% |
| 37 | 27.9% |
| 38 | 29.6% |
| 39 | 27.6% |

The Jan 2027 chain shows **positive call skew** — IV rises from ~23% at $30 strike to ~30% at $38. That is *unusual* (equity ETFs typically have put skew) and consistent with speculative call demand. **You are paying more vol per dollar as you go further OTM.** That's exactly the wrong direction for a $39-strike "cheap lottery" thesis.

### (d) Historical / regime context

Reference ag-vol regimes:

| Regime | Approx DBA / soft-comdty 1y RV |
|---|---|
| 2010 La Niña → wheat / cotton spike | ~28-32% |
| 2012 US Midwest drought | ~25-30% |
| 2020-2021 reflation | ~18-22% |
| 2021-2022 food-inflation cycle | ~25-35% |
| 2023-2024 cocoa/sugar squeeze | DBA muted, but cocoa/coffee/sugar each spiked 60-200% |
| Current DBA 30d RV | 12.3% |
| Current Jan27 $35 IV | 25.2% |

Current IV is roughly in line with a *mild* La Niña / drought regime — not pricing a 2022-style food shock.

**Verdict by strike (original draft):**

| Strike | Cheap / Fair / Expensive | Rationale |
|---|---|---|
| Jan27 $30 | FAIR | 23% IV, slightly below ATM-equivalent — closest to "true vol" |
| Jan27 $33 | FAIR-RICH | 24% IV, decent OI (930), still on the cheaper side of the curve |
| Jan27 $35 | RICH | 25% IV, ~2x RV, sitting near IV-rank highs |
| Jan27 $38-39 | RICH-TO-EXPENSIVE | 28-30% IV, full skew tax |
| Oct26 $35 | RICH (but cheap in absolute dollars) | 28% IV, but only ~10 months until expiry |

**Verdict by strike (revised after 2026-05-18 live signals):**

| Strike | Re-rated | Rationale |
|---|---|---|
| Jan27 $30 | FAIR-CHEAP | 23% IV underprices the new state-of-knowledge. The market hasn't fully repriced the lower strikes for confirmed El Niño + 92% LPA monsoon. |
| Jan27 $33 | FAIR | Now the consensus strike; IV is reasonable, OI 930 reflects the trade is being put on by others. |
| Jan27 $35 | FAIR | The 25% IV → 2.05× RV ratio looked rich in isolation; against confirmed thesis it's appropriate. Not cheap, not chasing. |
| Jan27 $38-39 | FAIR-RICH | The call skew tax is real but the 2022-style food-inflation tail is now a higher-probability scenario than the original draft assumed. Still skip unless seeking pure tail. |
| Oct26 $35 | RICH | Convex per-dollar, but expires before the late-2026 ENSO peak. The 10-month duration is now the wrong window. |

## 4. Scenario Analysis @ Jan 2027 Expiration

Per-contract values. Cost = mid × 100.

| Structure | Cost / ctr | Breakeven | $30 | $35 | $40 | $45 | $50 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Jan27 $30 | $160.00 | $31.60 | 0.0x | 3.1x | 6.3x | 9.4x | 12.5x |
| Jan27 $33 | $76.00 | $33.76 | 0.0x | 2.6x | 9.2x | 15.8x | 22.4x |
| Jan27 $35 | $55.00 | $35.55 | 0.0x | 0.0x | 9.1x | 18.2x | 27.3x |
| Jan27 $39 | $33.00 | $39.33 | 0.0x | 0.0x | 3.0x | 18.2x | 33.3x |
| Oct26 $35 (10mo) | $30.00 | $35.30 | 0.0x | 0.0x | 16.7x | 33.3x | 50.0x |
| Vertical 35/39 (Jan27) | $22.00 | ≥ 35.22 | 0.0x | 0.0x | 18.2x | 18.2x | 18.2x |

### Lognormal probabilities of finishing above strike (Jan 15 2027)

| Vol regime | DBA ≥ $30 | ≥ $35 | ≥ $40 | ≥ $45 | ≥ $50 |
|---|---:|---:|---:|---:|---:|
| rv30 (12.3%) | 21.2% | 1.0% | 0.0% | 0.0% | 0.0% |
| iv_current (25.2%) | 32.0% | 11.1% | 3.1% | 0.7% | 0.2% |
| el_nino_analog (35.0%) | 34.2% | 17.2% | 7.8% | 3.4% | 1.4% |
| food_inflation_2022 (45.0%) | 34.9% | 20.9% | 12.0% | 6.7% | 3.7% |

**Read:** Even under a 2022-style food-inflation analog (45% vol), the $35 strike has only ~21% chance of finishing ITM. The $40 strike: 12%. Probability of total loss on the $35 calls: ~79%; on the $39 calls: ~88%. Treat the 100% loss as the modal outcome.

## 5. Expected Value & Convexity per Dollar

### EV multiples (lognormal Monte-Carlo, $1 → $X expected at Jan 2027)

| Strike | RV30 (12%) | Current IV (25%) | El Niño analog (35%) | Food-inflation analog (45%) |
|---|---:|---:|---:|---:|
| Jan27 $35 | 0.02x | 0.76x | 1.90x | 3.30x |
| Jan27 $39 | 0.00x | 0.41x | 1.61x | 3.45x |

**Reading the EV table:**

- At today's realized vol regime, **both strikes have negative EV** — they are losing trades on a probability-weighted basis.
- Under an El Niño-style vol re-rating (RV → 35%), the $35 strike has the higher EV (**1.90x vs 1.61x**).
- Only under a 2022-class food-inflation tail (RV → 45%) does the **$39 strike's** EV (3.45x) edge ahead of the $35 (3.30x).
- _**$35 dominates in 3 of 4 regimes; $39 only wins in the extreme tail.**_

### Convexity per dollar of premium (gamma / mid)

| Contract | Mid | Δ | γ | γ/$ | ν/$ |
|---|---:|---:|---:|---:|---:|
| Oct26 $35 | $0.30 | 0.135 | 0.0431 | 0.1436 | 0.1181 |
| Jan27 $35 | $0.55 | 0.173 | 0.0442 | 0.0804 | 0.1215 |
| Jan27 $39 | $0.33 | 0.091 | 0.0259 | 0.0784 | 0.1427 |
| Jan27 $33 | $0.76 | 0.246 | 0.0567 | 0.0747 | 0.0853 |
| Jan27 $30 | $1.60 | 0.410 | 0.0737 | 0.0461 | 0.0575 |

**Oct 2026 $35 has highest γ/$**, which is the *shorter-dated convexity question* — yes, the Oct26 $35 buys more gamma per dollar but it expires 3 months before peak Northern-Hemisphere harvest data. If your thesis is "El Niño peaks Q3 2026 and prints to crops," the Oct26 strike could pay off. If your thesis is "story plays out over 2026 with potential 2027 second-leg," Jan27 dominates.

### IV sensitivity (mid-life, 6 months from now)

Per-contract value if you exit in ~6 months at varying spot × IV. (Jan27 $35, cost $55)

| Spot ↓ \ IV → | 15% | 20% | 25% | 30% | 40% |
|---|---:|---:|---:|---:|---:|
| $28 | 0.00x | 0.01x | 0.04x | 0.11x | 0.42x |
| $32 | 0.16x | 0.42x | 0.75x | 1.13x | 1.98x |
| $36 | 2.98x | 3.45x | 3.94x | 4.44x | 5.46x |
| $40 | 9.57x | 9.65x | 9.83x | 10.09x | 10.77x |

**Implication:** even with no spot move (DBA stays $28), an IV expansion from 25% → 40% would deliver a ~2x mid-life exit. Most of the trade's PnL in the first 6-9 months will come from **IV repricing, not spot delta**. This is a vol trade dressed as a directional trade.

## 6. Strike & Structure Comparison

### Direct long calls

| | Jan27 $35 | Jan27 $39 |
|---|---|---|
| Cost / contract | $55.00 | $33.00 |
| Delta | 0.173 | 0.091 |
| IV | 25.2% | 27.6% |
| $/delta | 318 | 363 |
| Breakeven (DBA at exp) | $35.55 (+27.7%) | $39.33 (+41.3%) |
| OI / liquidity | 10 (thin) | 906 (best in chain) |

The $39 is **better-bid** in the OI sense (906 contracts vs 10) but **worse-priced** in vol terms. Don't conflate "liquid" with "fair."

### Vertical (Jan27 $35 / $39 call spread)
- Net debit: **$22.00** / spread
- Max value: $400
- Max return: 18.2x (~1718%) if DBA ≥ $39
- **Caps upside at $39** — kills the convex tail. *Not* what a "lose-it-all-or-30x" trader wants.

### Split allocation (70/30 $35/$39, $5,000 risk budget)
Sample sizing: **63 × $35 contracts** + **45 × $39 contracts**, total cost ≈ **$4950.00**.

| Spot at Jan 2027 | Total value | Return mult |
|---:|---:|---:|
| $30 | $0.00 | 0.00x |
| $35 | $0.00 | 0.00x |
| $40 | $36000.00 | 7.27x |
| $45 | $90000.00 | 18.18x |
| $50 | $144000.00 | 29.09x |

## 7. Entry Price Tiers

Reverse-engineered from EV-positive break-points under an *El-Niño-vol-analog* (35% RV) outcome.

### Jan 2027 $35 Calls

| Tier | Price range | Comment |
|---|---|---|
| **Excellent entry** | $0.35 – $0.42 | Implies IV ~18-20%. Possible only on a 5-10% DBA pullback or vol crush. |
| **Good entry** | $0.43 – $0.50 | Implies IV ~21-23%. Wait for it on green-thumb / bumper-crop days. |
| **Fair (today)** | **$0.51 – $0.60** | Where it trades now ($0.55). Don't refuse, don't chase. |
| Avoid / chasing | > $0.65 | IV > 28%, means you're paying a thesis premium. |

### Jan 2027 $39 Calls (a.k.a. "the $40s")

| Tier | Price range | Comment |
|---|---|---|
| **Excellent entry** | $0.18 – $0.23 | Pre-thesis pricing. Wait. |
| **Good entry** | $0.24 – $0.30 | Skew has flattened. |
| **Fair (today)** | **$0.31 – $0.37** | Currently $0.33. |
| Avoid / chasing | > $0.40 | Skew tax compounding. The market is paying *up* for the same lottery ticket. |

## 8. Historical Analogs

| Episode | Catalyst | Soft-comdty / ag move | DBA-equivalent move | What worked |
|---|---|---|---|---|
| **2010-11 La Niña** | Russia heat / wheat ban | Wheat +80%, cotton +120% | DBA +24% in 7 months | Long-dated OTM calls (held vol re-rated up) |
| **2012 US drought** | Midwest heat | Corn +60%, soy +35% | DBA +15% in 4 months | Vertical spreads (move was fast, skew flattened) |
| **2020-21 reflation** | Stimulus + supply chains | Corn +90%, soy +60% | DBA +28% in 12 months | Long calls + roll out |
| **2022 food inflation** | Ukraine + drought | Wheat +60% intraweek, sugar +30% | DBA +18% in 6 months | Short-dated calls (theta-positive on first week of war) |
| **2023-24 cocoa/sugar** | Ghana/Ivory Coast crops, India sugar | Cocoa +400%, sugar +60% | DBA muted (weight mix) | Single-commodity futures > DBA |

**Lesson for the current trade:**

1. DBA tends to lag headline commodities by 1-2 months because of the index weighting (live cattle / lean hogs dilute the grain/sugar pop).
2. Historical "ag rally" + 12-15 months = +15-28% spot move. That puts DBA at **$32-36** in the modal bull case — which doesn't touch the $35 break-even with much room to spare.
3. The $40+ tail requires a *2010-La-Niña + 2022-food-inflation overlap* — possible, not modal.
4. **The trade is essentially: pay 2x realized vol for the right to participate in a regime that hasn't started yet.**

## 9. Vol Sensitivity & Path Dependence

### Sparkline charts

**DBA spot (last 90 closes):**

```
▂▂▂▁▁▁▁▁▁▁▁▂▂▂▂▂▁▁▂▁▂▂▂▂▂▂▂▁▂▂▂▂▂▂▂▂▂▂▂▃▄▃▃▄▄▄▃▃▄▄▄▄▄▄▅▅▅▅▄▅▅▄▄▄▄▄▅▅▅▄▄▅▅▅▅▅▆▇▆▇▇▇▇▆▆▇██▇▆
```

**Oct 2026 $35 call mid (last 22 print days, proxy for IV behavior):**

```
▂▂▃▃▃▂▂▃▁▁▁▁▁▃▅▄▇▄▅█▄▄
```

**Implied vol back-solve on the same contract:**

```
▂▂▃▃▄▁▂▃▂▃▂▃▁▃▅▄▇▅▆█▃█
```

### Sensitivities

- **Vega (Jan27 $35): 0.067** per vol point. A 5-vol pop (25→30%) ≈ +$33 / contract on price alone, regardless of spot.
- **Theta (Jan27 $35): -0.0031** per day → about $1.10 / contract / day decay at current vol. That's ~2% / day of premium when nothing happens.
- **Time to expiration: 242 days (~8.1 months).** That gives ~30-40 weather/USDA prints to repriceon.

### Probability of total loss
Per the lognormal model:

| Strike | P(total loss) @ current vol | @ El Niño analog | @ food-inflation analog |
|---|---:|---:|---:|
| Jan27 $35 | 88.9% | 82.8% | 79.1% |
| Jan27 $39 | 96.0% | 90.8% | 86.5% |

## 10. Final "Best Speculative Trade"

Given the spec:
- Convexity > consistency
- Total loss acceptable
- $1k-$5k risk budget
- 6-18 month horizon

> ### 🎯 Recommended structure (for a $3,000 risk allocation):
> 
> - **40 × Jan 2027 $35 calls @ ≤ $0.55** = $2,200 risk
> - **25 × Jan 2027 $39 calls @ ≤ $0.33** = $825 risk
> - **Total cost: ~$3,025 / max loss: 100%**
> 
> #### Why this mix:
> - The $35 leg dominates EV in 3-of-4 vol regimes; size it bigger.
> - The $39 leg only matters if you get the 2022-class food-inflation tail; keep it as a tail-hedge / lottery sleeve.
> - **Don't do the vertical** — it caps you at exactly the strike where the El Niño thesis pays off.
> - **Don't go shorter-dated (Oct26)** unless you have a specific Q3-2026 weather-print catalyst — Jan27 buys you the second leg.
> 
> #### Payoff table:
> 
> | DBA Jan 2027 | Total payoff | Return on $3,025 |
> |---:|---:|---:|
> | $30 | $0.00 | 0.00x |
> | $35 | $0.00 | 0.00x |
> | $40 | $22500.00 | 7.44x |
> | $45 | $55000.00 | 18.18x |
> | $50 | $87500.00 | 28.93x |
> 
> #### Rules of engagement:
> 1. **Scale in over 2-3 weeks**, not all at once. Skew is rich; you'll get pullbacks.
> 2. **Don't roll on losses.** If DBA drifts to $26 and the $35s halve, that's the thesis decaying — don't double down.
> 3. **Take 50% off at 3x** if you get an early IV pop (likely in summer 2026 around peak weather season).
> 4. **Reassess by Sep 2026** — if no IV pop and DBA still <$30, recognize that's the modal outcome and let the rest run to expiry.

## 11. Caveats & Data Notes

- Polygon free-tier doesn't publish live NBBO bid/ask, so the "bid"/"ask" columns are day low/high of trades. Real-world execution may be wider, especially on the thinly-traded $30, $34-$36 strikes (OI < 50).
- IV-rank in section 3(b) uses a ~22-day window on the **Oct 2026 $35** (the only contract with daily prints). Treat as a rough estimate — a real 1-year IV rank requires options history we don't have on free tier.
- The 250d realized vol returned null because our daily-history pull was capped at 250 bars (need 251 closes for 250 returns). 60d RV ≈ 10.4% is the best long-window proxy here.
- Probabilities use a flat lognormal model — they ignore the documented fat right tail in soft commodities. Real upside probabilities are likely 1.3-1.8x what the model shows.
- All greeks are **Polygon-published**, not re-derived. Where prices imply different IVs vs published, trust the published IV for cross-strike comparison.

---
_Generated by `el-nino-options` — see [README](../README.md). Cached SQLite at `out/cache.db`._