# el-nino-options

Speculative analysis of long-dated DBA call options (Jan 2027 $35 / $40) framed
around an El Niño / agricultural commodity inflation thesis.

Independent of `options-rr`, but borrows the SQLite-backed API caching pattern.

## Run

```
bun install
bun run src/fetch-chain.ts   # cache option chain + greeks + IV history
bun run src/analyze.ts        # scenario tables + verdicts
bun run src/report.ts         # write reports/dba-el-nino.md
```

Outputs:
- `out/cache.db` — SQLite cache for Polygon/FMP responses
- `reports/dba-el-nino.md` — final analyst write-up
