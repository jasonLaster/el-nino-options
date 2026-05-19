# el-nino-options

Speculative analysis of long-dated DBA call options framed around an El Niño /
agricultural commodity inflation thesis.

**Live interactive dashboard:** https://jasonlaster.github.io/el-nino-options/

Independent of `options-rr`, but borrows the SQLite-backed API caching pattern.

## Run

```
bun install

# DBA-only analysis
bun run src/fetch-chain.ts        # cache Jan 2027 chain + greeks + DBA history (Polygon)
bun run src/iv-history.ts         # back-solve IV for the targeted strikes
bun run src/analyze.ts            # scenarios, EV, convexity → out/analysis.json
bun run src/report.ts             # write reports/dba-el-nino.md
bun run src/build-html.ts         # write reports/dba-el-nino.html + docs/index.html

# Cross-ticker basket scan (uses Massive API bulk chain snapshot)
bun run src/fetch-multi-chain.ts  # one call per ticker → full chain w/ greeks
bun run src/strategy.ts           # rank by $/Δ + γ/$ → out/strategy.json
```

## Reports

- **[reports/ideal-strategy.md](reports/ideal-strategy.md)** ⭐ — the live cross-ticker scan + 7-leg basket (CANE, WEAT, MOS, NTR, HSY, GIS, MDLZ). Headline find: WEAT Jan27 $35 calls have $/Δ=$351 with OI 40,490.
- [reports/dba-el-nino.md](reports/dba-el-nino.md) — DBA Jan 2027 options analysis (simpler single-instrument play)
- [reports/dba-el-nino.html](reports/dba-el-nino.html) — interactive what-if dashboard (also at [GH Pages](https://jasonlaster.github.io/el-nino-options/))
- [reports/el-nino-deep-dive.md](reports/el-nino-deep-dive.md) — science / geopolitics / Ackman framework deep dive

## Live signal sources

Refreshed manually as the calendar rolls:

| Source | Cadence | Why it matters |
|---|---|---|
| [NOAA CPC ENSO Discussion](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml) | 2nd Thursday monthly | ENSO Alert level + seasonal probabilities |
| [IRI / CPC Forecast Plumes](https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/) | Monthly | Multimodel ensemble + Niño 1+2 subsurface |
| [IMD Long Range Monsoon](https://mausam.imd.gov.in/) | April + late May | Single highest-information event for the year |
| [USDA WASDE](https://www.usda.gov/oce/commodity/wasde) | 12th monthly | US + global supply-demand balance |
| [MPOB Palm Oil](https://bepi.mpob.gov.my/) | ~10th monthly | Malaysian production + stocks |

## Storage

- `out/cache.db` — SQLite (HTTP cache, option snapshots, IV history, DBA history)
- `out/analysis.json` — structured payload consumed by report.ts and build-html.ts
