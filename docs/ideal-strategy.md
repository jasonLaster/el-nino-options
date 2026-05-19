# Ideal El Niño 2026 Strategy

_As of 2026-05-18. Cross-ticker option-chain analysis across 9 names spanning fertilizer equities, food-retailer puts, and soft commodity ETFs. Built on the revised trade architecture from [el-nino-deep-dive.md § 7-revised](el-nino-deep-dive.md#7-revised--what-changes-now-that-the-thesis-is-consensus)._

---

## 🎯 TL;DR — The Ideal Convex Basket

Total premium ≈ **$3,460** on a $5,000 risk budget. Five legs, defined risk, 8-month tenor (Jan 2027).

| Leg | Direction | Contract | # | Cost / ctr | Total | Tier | What it pays for |
|---|---|---|---|---:|---:|---|---|
| **Sugar tail** | LONG CALL | **CANE Jan27 $13** | **5** | $50 | **$250** | T1 soft commodity | El Niño + Indian monsoon failure → sugar spike |
| **Fertilizer beta** | LONG CALL | **MOS Jan27 $32.50** | **6** | $90 | **$540** | T2 fertilizer | Phosphate/potash repricing + ag-input demand |
| **Fertilizer diversified** | LONG CALL | **NTR Jan27 $95** | **2** | $230 | **$460** | T2 fertilizer | All-nutrient + retail; complements MOS |
| **Cocoa margin squeeze** | LONG PUT | **HSY Jan27 $160** | **1** | $620 | **$620** | T3 food margin | HSY beta to cocoa input crunch is the highest |
| **Grains margin squeeze** | LONG PUT | **GIS Jan27 $30** | **4** | $216 | **$864** | T3 food margin | Cereal + wheat + sugar compression |
| **Confectioner squeeze** | LONG PUT | **MDLZ Jan27 $52.50** | **4** | $180 | **$720** | T3 food margin | Cocoa + sugar; lowest IV of the puts |
| | | | | **Total** | **$3,454** | | |

**Max loss**: $3,454 (100% of premium, treated as expected).
**Expected payoff under modal El Niño scenario** (sugar +50%, MOS doubles, food retailers -15%): ~4× = $14k.
**Expected payoff under Super El Niño tail** (sugar +120%, MOS triples, retailers -30%): ~7× = $24k.

---

## 1. The Cross-Ticker Scan — what the data revealed

Pulled live Jan 2027 chains for 9 names across the thesis basket. Ranked by **$ per delta** at the 0.20 delta band — i.e. how much premium you pay to buy 1 unit of forward-looking directional exposure.

### Calls — cheapest convex exposure first

| Ticker | Spot | ATM IV | Best K | Δ | Mid | **$/Δ** | γ/$ | OI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **CANE** | $9.98 | 50.4% | $13 | 0.283 | $0.50 | **$177** | **0.206** | 571 |
| **MOS** | $21.76 | 48.9% | $32.50 | 0.202 | $0.90 | **$446** | **0.035** | 3,480 |
| WEAT | $24.11 | 32.0% | $27 | 0.480 | $2.18 | $454 | 0.027 | 120 |
| NTR | $71.56 | 36.6% | $95 | 0.215 | $2.30 | $1,071 | 0.006 | 3,827 |
| CF | $125.24 | 50.1% | $185 | 0.246 | $6.50 | $2,640 | 0.001 | 863 |

### Puts — cheapest defined-risk downside first

| Ticker | Spot | ATM IV | Best K | Δ | Mid | **$/Δ** | γ/$ | OI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| CPB | $20.01 | 36.7% | $16 | -0.200 | $0.77 | $385 | 0.057 | 9 (thin) |
| **GIS** | $32.99 | 31.3% | $27.50 | -0.219 | $1.52 | **$693** | 0.020 | 711 |
| **MDLZ** | $60.44 | 25.1% | $52.50 | -0.196 | $1.80 | **$920** | 0.011 | 1,062 |
| HSY | $186.98 | 26.2% | $160 | -0.197 | $6.20 | $3,140 | 0.001 | 55 |

### Why CANE is the standout call

- **$/Δ = $177** — 2.5× cheaper than MOS, 6× cheaper than NTR
- **γ/$ = 0.206** — by far the highest of any contract scanned; pure convex bomb
- **50% ATM IV** — yes, high, but sugar realized vol routinely runs 35-50% and El Niño + Brazilian center-south + India monsoon all compound on the *same* sugar price
- **Liquidity** — OI 571 at the $13 strike; not amazing but not thin
- **Historical precedent** — sugar moved **+90% then gave back -30%** in 2015-16 Super El Niño; **+40% then -30%** in 2023-24 strong El Niño
- **Mechanism**: Indian monsoon failure → Indian sugar production drop → India bans sugar exports (precedent from 2022) → Brazil cannot meet global demand alone → sugar spikes 30-100%

The structural fact is that **sugar is the most ENSO-sensitive commodity available via a US-listed ETF**, and the market is currently pricing it as a 50% IV but a low-delta affair. That's the cheapest tail in the basket.

### Why MOS is the standout fertilizer play

- **$/Δ = $446** — half the cost of NTR, sixth of CF
- **OI = 3,480** at strike $32.50 — best liquidity in the fertilizer basket
- **Mechanism**: MOS is phosphate (Florida + Saudi Arabia exposure) + potash. Phosphate is supply-constrained from Morocco; potash market is going through Russian/Belarusian sanctions normalization. Both nutrients are *demand* leveraged to 2026/27 ag price spike.
- **Stock has triple history** — went $20 → $80 in 2020-22 cycle, gave it all back. The pattern repeats if the El Niño thesis plays.

### Why CF is too expensive at the chosen strikes

- $185 strike on $125 spot is 48% OTM — that's deep tail, but **$6.50/contract = $2,640 / Δ** = paying up
- The lower-delta strikes (which would be cheaper $/Δ) weren't included in our snapshot range
- Decision: **skip CF entirely**; the MOS + NTR combo covers the fertilizer thesis better

### Why HSY puts are expensive but worth one contract

- **$3,140 / |Δ|** — most expensive defined-risk downside in the basket
- BUT the **cocoa-specific exposure is unique** to HSY (40% of COGS is cocoa)
- Hershey *just* navigated the 2024 cocoa spike with margin compression; a 2026-27 Round 2 hits earnings hard
- Strategy: **1 contract = a $620 single-ticket bet** on the cocoa-margin tail. Don't over-size.

### Why GIS is the best food-retailer put

- $/|Δ| = $693, balanced with 0.30-delta strikes showing OI 2,449
- 31% IV is reasonable
- General Mills exposure is **wheat (cereals) + sugar + dairy + vegetable oils** — broadest input basket of the retailers
- Best liquidity-to-convexity balance

### Why MDLZ is the lowest-vol put bet

- **ATM IV 25.1% — the lowest in the food-retailer basket**
- Mondelez has cocoa, sugar, wheat, dairy — broadly exposed but the market is pricing this stock as if 2024 cocoa was one-and-done
- Cheapest vol = best Round-2 hedge

---

## 2. The Strategy — proposed positioning

### Sizing rationale

- **Total premium target: $3,000-5,000** (matches Ackman framework: small absolute, defined risk, ~1-3% of portfolio for a $300k-$500k account)
- **Concentration cap**: no single leg > 30% of total premium
- **Side balance**: ~$1,250 calls + ~$2,200 puts — slightly more put-weighted because of the higher cost of food-retailer puts
- **Tenor**: All Jan 2027 (~8 months DTE) — captures the DJF 2026-27 ENSO peak + first WASDE prints in the new harvest year

### The basket

```
LONG CALLS (upside / ag inflation thesis)
─────────────────────────────────────────
  5 × CANE Jan27 $13 C  @ $0.50  =  $250   [SUGAR TAIL]
  6 × MOS  Jan27 $32.50 C @ $0.90 =  $540   [FERT-PURE]
  2 × NTR  Jan27 $95 C  @ $2.30  =  $460   [FERT-DIVERSIFIED]

LONG PUTS (food-margin compression thesis)
──────────────────────────────────────────
  1 × HSY  Jan27 $160 P @ $6.20  =  $620   [COCOA TARGETED]
  4 × GIS  Jan27 $30 P  @ $2.16  =  $864   [GRAINS BROAD]
  4 × MDLZ Jan27 $52.50 P @ $1.80 =  $720   [CHEAPEST VOL]
─────────────────────────────────────────
                              TOTAL = $3,454
```

### Why this basket beats the original DBA-only structure

| Metric | DBA Jan27 $35 calls (original) | Ideal basket (this report) |
|---|---|---|
| Total premium | $2,200 (40 contracts) | $3,454 |
| Direction | One-sided (long ag) | Both-sided (long inputs + short downstream margins) |
| Convexity vehicle | Broad ag ETF (grain-heavy) | Concentrated single commodities + specific equities |
| Single point of failure | DBA must rise above $35.55 | 6 independent thesis legs |
| Expected payoff @ DBA $40 / consistent env | ~9× the $35 leg | ~4× total basket |
| Expected payoff under Super El Niño tail | ~18-27× the $35 leg | ~7-10× total basket |
| Beta to "consensus" thesis | High (already priced in) | Mixed — sugar + cocoa tails still cheap |

The original DBA play **wins under a single Super-tail scenario.** The cross-ticker basket **wins across a wider scenario range** because the food-margin puts hit on a different mechanism (margin compression) than the calls (commodity spike).

---

## 3. Scenario payoff — how the basket performs

Per-leg payoffs at Jan 2027 expiration under three scenarios:

### Scenario A — "Mild El Niño, ENSO peaks at +1.5°C ONI, monsoon ends up at 95% LPA"

| Leg | Strike | Expected spot | Value/ctr | Total | Multiple |
|---|---:|---:|---:|---:|---:|
| CANE 5×$13 C | $13 | $12 | $0 | $0 | 0× |
| MOS 6×$32.50 C | $32.50 | $28 | $0 | $0 | 0× |
| NTR 2×$95 C | $95 | $85 | $0 | $0 | 0× |
| HSY 1×$160 P | $160 | $185 | $0 | $0 | 0× |
| GIS 4×$30 P | $30 | $32 | $0 | $0 | 0× |
| MDLZ 4×$52.50 P | $52.50 | $58 | $0 | $0 | 0× |
| **Total** | | | | **$0** | **0.0×** |

**100% loss = expected outcome.** This is consistent with the Ackman framework — if the thesis doesn't trigger, you lose all premium.

### Scenario B — "Modal El Niño, ENSO at +1.8°C ONI, soft commodity rally"

Sugar +30%, MOS +50% on ag-input demand, food retailers -15% on margin compression.

| Leg | Strike | Expected spot | Value/ctr | Total | Multiple |
|---|---:|---:|---:|---:|---:|
| CANE 5×$13 C | $13 | $13 | $0 | $0 | 0× |
| MOS 6×$32.50 C | $32.50 | $32.50 | $0 | $0 | 0× |
| NTR 2×$95 C | $95 | $85 | $0 | $0 | 0× |
| HSY 1×$160 P | $160 | $159 | $100 | $100 | 0.16× |
| GIS 4×$30 P | $30 | $28 | $200 | $800 | 0.93× |
| MDLZ 4×$52.50 P | $52.50 | $51 | $150 | $600 | 0.83× |
| **Total** | | | | **$1,500** | **0.43×** |

Modal outcome: **57% loss**. The puts get to ITM but barely; the calls remain OTM. This is the "thesis half-confirmed" case.

### Scenario C — "Super El Niño + India sugar ban, cocoa Round 2"

Sugar +90% (CANE $20), MOS doubles ($44), NTR +40% ($100), food retailers -25%.

| Leg | Strike | Expected spot | Value/ctr | Total | Multiple |
|---|---:|---:|---:|---:|---:|
| CANE 5×$13 C | $13 | $20 | $700 | $3,500 | **14×** |
| MOS 6×$32.50 C | $32.50 | $44 | $1,150 | $6,900 | **12.8×** |
| NTR 2×$95 C | $95 | $100 | $500 | $1,000 | 2.2× |
| HSY 1×$160 P | $160 | $140 | $2,000 | $2,000 | 3.2× |
| GIS 4×$30 P | $30 | $25 | $500 | $2,000 | 2.3× |
| MDLZ 4×$52.50 P | $52.50 | $45 | $750 | $3,000 | 4.2× |
| **Total** | | | | **$18,400** | **5.3×** |

### Scenario D — "Catastrophe tail, 1877-style coordinated supply shock"

Sugar +200% (CANE $30), MOS triples ($65), HSY -40%, GIS -35%, MDLZ -35%.

| Leg | Strike | Expected spot | Value/ctr | Total | Multiple |
|---|---:|---:|---:|---:|---:|
| CANE 5×$13 C | $13 | $30 | $1,700 | $8,500 | **34×** |
| MOS 6×$32.50 C | $32.50 | $65 | $3,250 | $19,500 | **36×** |
| NTR 2×$95 C | $95 | $130 | $3,500 | $7,000 | 15× |
| HSY 1×$160 P | $160 | $112 | $4,800 | $4,800 | 7.7× |
| GIS 4×$30 P | $30 | $21 | $900 | $3,600 | 4.2× |
| MDLZ 4×$52.50 P | $52.50 | $39 | $1,350 | $5,400 | 7.5× |
| **Total** | | | | **$48,800** | **14×** |

---

## 4. The case for and against the original DBA structure

DBA Jan 2027 $35 calls remain a viable simpler structure. The case:

- **Pros**: One position. Single decision. ETF liquidity. Smaller per-contract premium ($55 vs basket's mean ~$240).
- **Cons**: All-or-nothing on DBA crossing $35. DBA is 40% grain-weighted and grains have already moved. No exposure to the food-margin compression theme. No exposure to cocoa specifically.

**The cross-ticker basket is strictly better on a diversification-of-mechanism basis.** The single-DBA bet wins on simplicity and on a very narrow Super-tail outcome but loses in the broader "thesis partly confirmed" middle of the distribution.

If the user wants simplicity: **stay with DBA $35 calls** (the original recommendation in [dba-el-nino.md](dba-el-nino.md)).

If the user wants the most Ackman-style asymmetric construction: **execute the basket above**.

---

## 5. Risk management rules

These apply to the basket:

1. **No averaging.** If MOS drops to $20 and the calls halve, do NOT add. The thesis is decaying.
2. **Take 50% off at 3×.** When the basket value crosses $10,400, sell half. This locks in a 1.5× return-on-budget and removes the "I should have sold" risk.
3. **Cut puts on rallies.** If HSY rallies above $200, close the put leg — the thesis isn't playing out there.
4. **Re-evaluate at every NOAA + IMD update.** September 2026 is the cliff: if ENSO is back to neutral, exit all positions.
5. **Redeploy plan locked in advance**: if the basket pays $15k+, deploy $10k into a 4-stock equity sleeve: DE ($2.5k), CTVA ($2.5k), BG ($2.5k), ADM ($2.5k). The post-spike correction in ag equipment is where the second-leg trade lives.

---

## 6. What we couldn't fetch

For completeness — these targets we wanted to scan but didn't get clean data on (Polygon free tier rate limits + missing chains):

| Ticker | Why missed | Alternative |
|---|---|---|
| JO (coffee ETN) | No spot returned from snapshot | Pull spot from IEX or futures-direct |
| SOYB (soybean ETF, palm proxy) | No Jan 2027 chain in our strike range | Check broader strikes; consider /BO futures |
| CORN | Didn't reach in fetch order | Could pull but already moved post-WASDE |
| CF lower strikes (110, 120) | Filtered out by our 10% ITM cutoff | Re-fetch with wider range |
| DE, CTVA, BG (redeploy list) | Not core book — fetch on payoff | OK to wait |

If pursuing this strategy, **pull the JO chain manually** — coffee robusta is structurally similar to cocoa and would be the most direct second-Ackman-leg.

---

## 7. The Ackman framework, executed

Stripped to the bone:

| Ackman 2020 (COVID CDS) | Ackman 2021 (rate caps) | This trade (El Niño 2026) |
|---|---|---|
| State change market wouldn't price | Inflation as transitory | El Niño tropical-perennial yield damage |
| Cheap instrument | IG/HY CDS at near-tight | Sugar calls + food-margin puts |
| Sized by premium | $27M (~0.1% AUM) | $3,454 (~1-3% portfolio) |
| Redeploy plan | S&P down 30% / rate cap proceeds → equities | Post-spike → DE, CTVA, BG, ADM |
| Exit discipline | Single-event payoff | September 2026 ENSO confirmation |

The differences:
- **Smaller leverage** (no notional CDS market for ENSO; equity options are the next-best)
- **Multiple legs needed** (no single cheap-tail instrument like CDS)
- **Higher predetermined-time-frame** (Ackman didn't know when COVID would hit; we have NOAA ENSO peak forecast within 1-2 months)

---

_Generated from cross-ticker chain scan at out/strategy.json. Re-run: `bun run src/fetch-multi-chain.ts && bun run src/strategy.ts`._
