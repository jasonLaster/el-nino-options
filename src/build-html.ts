/**
 * Build a standalone, self-contained interactive HTML artifact from analysis.json.
 * No CDN deps — vanilla JS + Canvas. Drop it on any disk and open.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "./cache.ts";

const analysis = JSON.parse(
  readFileSync(resolve(import.meta.dir, "..", "out", "analysis.json"), "utf8")
);

const dbaHist = db
  .query<{ date: string; close: number }, []>(
    `SELECT date, close FROM underlying_history WHERE underlying = 'DBA' ORDER BY date ASC`
  )
  .all();

const oct35Iv = db
  .query<{ date: string; close: number | null; iv: number | null }, [string]>(
    `SELECT date, close, iv FROM iv_history WHERE ticker = ? ORDER BY date ASC`
  )
  .all("O:DBA261016C00035000")
  .filter((r) => r.iv != null);

const payload = {
  ...analysis,
  dbaHistory: dbaHist,
  oct35IvHistory: oct35Iv,
};

const PAYLOAD = JSON.stringify(payload);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>DBA · Jan 2027 Speculative Call Analyzer</title>
<style>
  :root {
    --bg: #0d1117;
    --panel: #161b22;
    --panel-2: #1c232c;
    --border: #30363d;
    --text: #e6edf3;
    --muted: #8b949e;
    --accent: #58a6ff;
    --green: #3fb950;
    --red: #f85149;
    --yellow: #d29922;
    --orange: #db6d28;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--bg); color: var(--text);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  body { max-width: 1180px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 32px 0 12px; padding-top: 16px; border-top: 1px solid var(--border); }
  h3 { font-size: 14px; margin: 16px 0 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .subtitle { color: var(--muted); margin-bottom: 24px; }
  .grid { display: grid; gap: 16px; }
  .cols-2 { grid-template-columns: 1fr 1fr; }
  .cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .cols-4 { grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 800px) { .cols-2, .cols-3, .cols-4 { grid-template-columns: 1fr; } }
  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
  }
  .stat {
    background: var(--panel-2);
    border-radius: 6px;
    padding: 12px;
  }
  .stat .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat .value { font-size: 22px; font-weight: 600; margin-top: 4px; }
  .stat .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .green { color: var(--green); }
  .red { color: var(--red); }
  .yellow { color: var(--yellow); }
  .orange { color: var(--orange); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  th { color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  tr:hover td { background: rgba(255,255,255,0.02); }
  .highlight-row td { background: rgba(88, 166, 255, 0.08); }

  .slider-row {
    display: grid;
    grid-template-columns: 110px 1fr 80px;
    align-items: center;
    gap: 12px;
    margin: 10px 0;
  }
  .slider-row label { color: var(--muted); font-size: 12px; }
  .slider-row input[type=range] {
    width: 100%;
    accent-color: var(--accent);
  }
  .slider-row .val { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }

  .chart-wrap { position: relative; height: 320px; }
  canvas { display: block; width: 100%; height: 100%; }

  details { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
  summary { cursor: pointer; font-weight: 600; color: var(--accent); }
  details[open] summary { margin-bottom: 12px; }

  .verdict {
    background: linear-gradient(135deg, rgba(88,166,255,0.08), rgba(63,185,80,0.06));
    border: 1px solid var(--accent);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .verdict h3 { color: var(--accent); margin-top: 0; }

  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pill-green { background: rgba(63,185,80,0.15); color: var(--green); border: 1px solid rgba(63,185,80,0.4); }
  .pill-yellow { background: rgba(210,153,34,0.15); color: var(--yellow); border: 1px solid rgba(210,153,34,0.4); }
  .pill-orange { background: rgba(219,109,40,0.15); color: var(--orange); border: 1px solid rgba(219,109,40,0.4); }
  .pill-red { background: rgba(248,81,73,0.15); color: var(--red); border: 1px solid rgba(248,81,73,0.4); }

  .small { font-size: 12px; color: var(--muted); }
  .mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, "SF Mono", Monaco, Consolas, monospace; }
  .toggle-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .toggle {
    background: var(--panel-2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 12px;
    border-radius: 16px;
    cursor: pointer;
    font-size: 12px;
  }
  .toggle.active { background: var(--accent); color: #0d1117; border-color: var(--accent); }

  .footer { color: var(--muted); font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); }
</style>
</head>
<body>

<h1>DBA · Jan 2027 Speculative Call Analyzer</h1>
<div class="subtitle">El Niño / agricultural inflation thesis · interactive scenario tool · <span id="asOf"></span></div>

<div class="verdict">
  <h3>🎯 Best speculative trade</h3>
  <strong>40 × Jan 2027 $35 calls @ ≤ $0.55</strong> &nbsp;+&nbsp; <strong>25 × Jan 2027 $39 calls @ ≤ $0.33</strong>
  <div class="small" style="margin-top: 8px;">Total cost ~$3,025 · 100% loss acceptable · Skip the vertical (caps the convex tail) · Skip Oct 2026 (no Q4 catalyst)</div>
</div>

<div class="grid cols-4">
  <div class="stat"><div class="label">DBA Spot</div><div class="value mono" id="spot">$—</div></div>
  <div class="stat"><div class="label">30d Realized Vol</div><div class="value mono" id="rv30">—</div></div>
  <div class="stat"><div class="label">$35 IV</div><div class="value mono" id="iv35">—</div></div>
  <div class="stat"><div class="label">IV / RV</div><div class="value mono" id="ivrv">—</div></div>
</div>

<h2>1 · What-if simulator</h2>
<div class="panel">
  <div class="slider-row">
    <label>DBA at exit</label>
    <input id="sl-spot" type="range" min="20" max="55" step="0.25" value="40" />
    <div class="val mono"><span id="v-spot">$40.00</span></div>
  </div>
  <div class="slider-row">
    <label>IV at exit</label>
    <input id="sl-iv" type="range" min="10" max="60" step="0.5" value="30" />
    <div class="val mono"><span id="v-iv">30.0%</span></div>
  </div>
  <div class="slider-row">
    <label>Months from now</label>
    <input id="sl-months" type="range" min="0" max="8" step="0.25" value="6" />
    <div class="val mono"><span id="v-months">6.0 mo</span></div>
  </div>
  <div class="slider-row">
    <label>Risk-free rate</label>
    <input id="sl-rfr" type="range" min="0" max="8" step="0.1" value="4.3" />
    <div class="val mono"><span id="v-rfr">4.3%</span></div>
  </div>

  <table style="margin-top: 16px;">
    <thead>
      <tr><th>Structure</th><th>Cost / unit</th><th>Value / unit</th><th>Return mult</th><th>P/L %</th><th>Verdict</th></tr>
    </thead>
    <tbody id="sim-rows"></tbody>
  </table>
</div>

<h2>2 · Payoff at expiration</h2>
<div class="panel">
  <div class="toggle-row" id="payoff-toggles"></div>
  <div class="chart-wrap"><canvas id="payoffChart"></canvas></div>
  <div class="small">Per $100 of premium deployed. Solid line = total value, dashed = breakeven.</div>
</div>

<h2>3 · IV skew · Jan 2027</h2>
<div class="grid cols-2">
  <div class="panel">
    <div class="chart-wrap"><canvas id="skewChart"></canvas></div>
  </div>
  <div class="panel">
    <h3>Reading the skew</h3>
    <p>DBA Jan 2027 shows <strong>positive call skew</strong> — IV rises with strike. That is unusual for an ETF (typically put-skewed) and means upside calls are being bid by speculation.</p>
    <p><strong>Implication for the $39 (a.k.a. "$40") leg:</strong> you're paying ~4 vol points more than the $33 strike for less delta. Skew tax = real cost.</p>
    <p class="small">Compare to: SPY ATM-vs-OTM call skew typically &lt; 1 vol pt. A 5+ pt positive call skew on a 10-strike range is a thesis premium.</p>
  </div>
</div>

<h2>4 · Probability cone</h2>
<div class="panel">
  <table>
    <thead>
      <tr>
        <th>Vol regime</th>
        <th>P(DBA ≥ 30)</th>
        <th>P(DBA ≥ 33)</th>
        <th>P(DBA ≥ 35)</th>
        <th>P(DBA ≥ 39)</th>
        <th>P(DBA ≥ 45)</th>
        <th>P(DBA ≥ 50)</th>
      </tr>
    </thead>
    <tbody id="prob-rows"></tbody>
  </table>
  <div class="small" style="margin-top: 8px;">Lognormal at Jan 15 2027. Real soft-commodity right-tail is fatter than lognormal — treat upside probs as a floor.</div>
</div>

<h2>5 · Expected value &amp; convexity</h2>
<div class="grid cols-2">
  <div class="panel">
    <h3>EV multiple per regime (lognormal)</h3>
    <table>
      <thead><tr><th>Strike</th><th>RV30 (12%)</th><th>Current (25%)</th><th>El Niño (35%)</th><th>Food infl. (45%)</th></tr></thead>
      <tbody id="ev-rows"></tbody>
    </table>
    <div class="small" style="margin-top: 8px;">$1 of premium → expected $X at expiration. &lt;1 = EV-negative.</div>
  </div>
  <div class="panel">
    <h3>Convexity per dollar</h3>
    <table>
      <thead><tr><th>Contract</th><th>Mid</th><th>γ/$</th><th>ν/$</th></tr></thead>
      <tbody id="conv-rows"></tbody>
    </table>
    <div class="small" style="margin-top: 8px;">γ/$ ranks raw "lottery efficiency." Oct26 $35 wins but expires 3mo before peak data.</div>
  </div>
</div>

<h2>6 · Chain snapshot · Jan 2027</h2>
<div class="panel" style="overflow-x: auto;">
  <table>
    <thead>
      <tr><th>Strike</th><th>Mid</th><th>IV</th><th>Δ</th><th>γ</th><th>θ</th><th>ν</th><th>OI</th><th>Vol</th><th>Breakeven</th></tr>
    </thead>
    <tbody id="chain-rows"></tbody>
  </table>
</div>

<h2>7 · Entry tiers</h2>
<div class="grid cols-2">
  <div class="panel">
    <h3>Jan 2027 $35 calls</h3>
    <table>
      <tr><td><span class="pill pill-green">Excellent</span></td><td class="mono">$0.35 – $0.42</td><td class="small">IV ~18-20%</td></tr>
      <tr><td><span class="pill pill-yellow">Good</span></td><td class="mono">$0.43 – $0.50</td><td class="small">IV ~21-23%</td></tr>
      <tr><td><span class="pill pill-orange">Fair (today)</span></td><td class="mono">$0.51 – $0.60</td><td class="small">currently $0.55</td></tr>
      <tr><td><span class="pill pill-red">Chase</span></td><td class="mono">&gt; $0.65</td><td class="small">IV &gt; 28%</td></tr>
    </table>
  </div>
  <div class="panel">
    <h3>Jan 2027 $39 calls ("the $40s")</h3>
    <table>
      <tr><td><span class="pill pill-green">Excellent</span></td><td class="mono">$0.18 – $0.23</td><td class="small">pre-thesis</td></tr>
      <tr><td><span class="pill pill-yellow">Good</span></td><td class="mono">$0.24 – $0.30</td><td class="small">skew flattened</td></tr>
      <tr><td><span class="pill pill-orange">Fair (today)</span></td><td class="mono">$0.31 – $0.37</td><td class="small">currently $0.33</td></tr>
      <tr><td><span class="pill pill-red">Chase</span></td><td class="mono">&gt; $0.40</td><td class="small">skew tax compounds</td></tr>
    </table>
  </div>
</div>

<h2>8 · DBA underlying price</h2>
<div class="panel">
  <div class="chart-wrap"><canvas id="dbaChart"></canvas></div>
</div>

<details>
  <summary>Historical analogs</summary>
  <table>
    <thead><tr><th>Episode</th><th>Catalyst</th><th>Soft-comdty move</th><th>DBA move</th><th>What worked</th></tr></thead>
    <tbody>
      <tr><td>2010-11 La Niña</td><td>Russia heat / wheat ban</td><td>Wheat +80%, cotton +120%</td><td>+24% / 7mo</td><td>Long-dated OTM calls</td></tr>
      <tr><td>2012 US drought</td><td>Midwest heat</td><td>Corn +60%, soy +35%</td><td>+15% / 4mo</td><td>Verticals (move was fast)</td></tr>
      <tr><td>2020-21 reflation</td><td>Stimulus + supply chains</td><td>Corn +90%, soy +60%</td><td>+28% / 12mo</td><td>Long calls + roll</td></tr>
      <tr><td>2022 food inflation</td><td>Ukraine + drought</td><td>Wheat +60% intraweek</td><td>+18% / 6mo</td><td>Short-dated calls</td></tr>
      <tr><td>2023-24 cocoa/sugar</td><td>Ghana/Ivory Coast</td><td>Cocoa +400%, sugar +60%</td><td>DBA muted</td><td>Single-commodity futures &gt; DBA</td></tr>
    </tbody>
  </table>
</details>

<details>
  <summary>Recommended structure payoff table</summary>
  <table>
    <thead><tr><th>DBA at Jan 2027</th><th>Total value</th><th>Return on $3,025</th></tr></thead>
    <tbody id="rec-rows"></tbody>
  </table>
</details>

<details>
  <summary>Caveats &amp; data notes</summary>
  <ul class="small">
    <li>Polygon free tier doesn't publish live NBBO bid/ask — bid/ask columns are day low/high of trades.</li>
    <li>IV rank uses a ~22-day window on Oct 2026 $35 (only contract with daily prints).</li>
    <li>Jan 2027 chain only lists $19-$39 strikes. No $40 exists. $39 = de facto "$40."</li>
    <li>Probabilities use a flat lognormal — soft commodities have fatter right tails in practice.</li>
    <li>Recompute live: <code>bun run src/fetch-chain.ts &amp;&amp; bun run src/analyze.ts &amp;&amp; bun run src/build-html.ts</code></li>
  </ul>
</details>

<div class="footer">
  Generated by <code>el-nino-options</code> · <a style="color: var(--accent);" href="https://github.com/jasonLaster/el-nino-options">github.com/jasonLaster/el-nino-options</a>
</div>

<script>
const DATA = ${PAYLOAD};

// -- Black-Scholes (call only) --
function normCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return 0.5 * (1.0 + sign * y);
}
function bsCall(S, K, T, r, sigma) {
  if (T <= 0) return Math.max(0, S - K);
  if (sigma <= 0) return Math.max(0, S - K) * Math.exp(-r * T);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S/K) + (r + 0.5*sigma*sigma)*T) / (sigma*sqrtT);
  const d2 = d1 - sigma*sqrtT;
  return S * normCDF(d1) - K * Math.exp(-r*T) * normCDF(d2);
}

const STRIKES = [
  { key: 'jan27_35', label: 'Jan27 $35', strike: 35, mid: DATA.targets.jan27_35?.mid ?? 0.55, exp: '2027-01-15' },
  { key: 'jan27_39', label: 'Jan27 $39', strike: 39, mid: DATA.targets.jan27_39?.mid ?? 0.33, exp: '2027-01-15' },
  { key: 'jan27_33', label: 'Jan27 $33', strike: 33, mid: DATA.targets.jan27_33?.mid ?? 0.76, exp: '2027-01-15' },
  { key: 'jan27_30', label: 'Jan27 $30', strike: 30, mid: DATA.targets.jan27_30?.mid ?? 1.60, exp: '2027-01-15' },
  { key: 'oct26_35', label: 'Oct26 $35', strike: 35, mid: DATA.targets.oct26_35?.mid ?? 0.30, exp: '2026-10-16' },
];

const DTE_JAN27 = DATA.dteJan27;
const DTE_OCT26 = Math.round((new Date('2026-10-16') - new Date(DATA.asOf)) / (24*60*60*1000));

// -- top stats --
document.getElementById('asOf').textContent = 'as of ' + DATA.asOf;
document.getElementById('spot').textContent = '$' + DATA.spot.toFixed(2);
document.getElementById('rv30').textContent = (DATA.realizedVol.rv30 * 100).toFixed(1) + '%';
document.getElementById('iv35').textContent = (DATA.targets.jan27_35.iv * 100).toFixed(1) + '%';
document.getElementById('ivrv').textContent = (DATA.targets.jan27_35.iv / DATA.realizedVol.rv30).toFixed(2) + 'x';

// -- simulator --
const slSpot = document.getElementById('sl-spot');
const slIv = document.getElementById('sl-iv');
const slMonths = document.getElementById('sl-months');
const slRfr = document.getElementById('sl-rfr');

function updateSim() {
  const spot = +slSpot.value;
  const iv = +slIv.value / 100;
  const months = +slMonths.value;
  const rfr = +slRfr.value / 100;
  document.getElementById('v-spot').textContent = '$' + spot.toFixed(2);
  document.getElementById('v-iv').textContent = (iv*100).toFixed(1) + '%';
  document.getElementById('v-months').textContent = months.toFixed(1) + ' mo';
  document.getElementById('v-rfr').textContent = (rfr*100).toFixed(1) + '%';

  const rows = STRIKES.map(s => {
    const baseDTE = s.exp === '2027-01-15' ? DTE_JAN27 : DTE_OCT26;
    const remainingDays = Math.max(0, baseDTE - months * 30);
    const T = remainingDays / 365;
    const value = bsCall(spot, s.strike, T, rfr, iv);
    const cost = s.mid;
    const mult = value / cost;
    const pnl = ((value - cost) / cost) * 100;
    let verdict;
    if (mult >= 5) verdict = '<span class="pill pill-green">🚀 ' + mult.toFixed(1) + 'x</span>';
    else if (mult >= 2) verdict = '<span class="pill pill-yellow">' + mult.toFixed(1) + 'x</span>';
    else if (mult >= 1) verdict = '<span class="pill pill-orange">' + mult.toFixed(2) + 'x</span>';
    else verdict = '<span class="pill pill-red">' + (mult * 100).toFixed(0) + '%</span>';
    return \`<tr><td>\${s.label}</td><td class="mono">$\${cost.toFixed(2)}</td><td class="mono">$\${value.toFixed(2)}</td><td class="mono">\${mult.toFixed(2)}x</td><td class="mono \${pnl>=0?'green':'red'}">\${pnl>=0?'+':''}\${pnl.toFixed(0)}%</td><td>\${verdict}</td></tr>\`;
  });

  // Vertical 35/39
  const v35 = bsCall(spot, 35, Math.max(0, DTE_JAN27 - months*30)/365, rfr, iv);
  const v39 = bsCall(spot, 39, Math.max(0, DTE_JAN27 - months*30)/365, rfr, iv);
  const vSpread = v35 - v39;
  const vCost = STRIKES[0].mid - STRIKES[1].mid;
  const vMult = vSpread / vCost;
  const vPnl = ((vSpread - vCost) / vCost) * 100;
  let vVerdict;
  if (vMult >= 5) vVerdict = '<span class="pill pill-green">🚀 ' + vMult.toFixed(1) + 'x</span>';
  else if (vMult >= 2) vVerdict = '<span class="pill pill-yellow">' + vMult.toFixed(1) + 'x</span>';
  else if (vMult >= 1) vVerdict = '<span class="pill pill-orange">' + vMult.toFixed(2) + 'x</span>';
  else vVerdict = '<span class="pill pill-red">' + (vMult * 100).toFixed(0) + '%</span>';
  rows.push(\`<tr><td>Vertical 35/39</td><td class="mono">$\${vCost.toFixed(2)}</td><td class="mono">$\${vSpread.toFixed(2)}</td><td class="mono">\${vMult.toFixed(2)}x</td><td class="mono \${vPnl>=0?'green':'red'}">\${vPnl>=0?'+':''}\${vPnl.toFixed(0)}%</td><td>\${vVerdict}</td></tr>\`);

  // Recommended mix (40 × $35 + 25 × $39, per $100 = scaled)
  const mixCost = 40 * STRIKES[0].mid + 25 * STRIKES[1].mid;
  const mixValue = 40 * v35 + 25 * v39;
  const mixMult = mixValue / mixCost;
  const mixPnl = ((mixValue - mixCost) / mixCost) * 100;
  let mixVerdict;
  if (mixMult >= 5) mixVerdict = '<span class="pill pill-green">🚀 ' + mixMult.toFixed(1) + 'x</span>';
  else if (mixMult >= 2) mixVerdict = '<span class="pill pill-yellow">' + mixMult.toFixed(1) + 'x</span>';
  else if (mixMult >= 1) mixVerdict = '<span class="pill pill-orange">' + mixMult.toFixed(2) + 'x</span>';
  else mixVerdict = '<span class="pill pill-red">' + (mixMult * 100).toFixed(0) + '%</span>';
  rows.push(\`<tr class="highlight-row"><td><strong>Recommended mix</strong></td><td class="mono">$\${mixCost.toFixed(2)}</td><td class="mono">$\${mixValue.toFixed(2)}</td><td class="mono">\${mixMult.toFixed(2)}x</td><td class="mono \${mixPnl>=0?'green':'red'}">\${mixPnl>=0?'+':''}\${mixPnl.toFixed(0)}%</td><td>\${mixVerdict}</td></tr>\`);

  document.getElementById('sim-rows').innerHTML = rows.join('');
  renderPayoff();
}
[slSpot, slIv, slMonths, slRfr].forEach(el => el.addEventListener('input', updateSim));

// -- Canvas helpers --
function hidpi(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  // Fallbacks: take parent width if rect is 0, default to 700×320
  const cssW = rect.width || canvas.parentElement?.clientWidth || 700;
  const cssH = rect.height || canvas.parentElement?.clientHeight || 320;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: cssW, h: cssH };
}

// -- Payoff chart at expiration --
const PAYOFF_STRUCTS = {
  jan27_35: { label: 'Jan27 $35', color: '#58a6ff', strike: 35, cost: STRIKES[0].mid },
  jan27_39: { label: 'Jan27 $39', color: '#f85149', strike: 39, cost: STRIKES[1].mid },
  vertical: { label: 'Vertical 35/39', color: '#d29922', verticalLower: 35, verticalUpper: 39, cost: STRIKES[0].mid - STRIKES[1].mid },
  mix: { label: 'Recommended mix (40×$35 + 25×$39)', color: '#3fb950', mix: true },
};

let activePayoffs = new Set(['jan27_35', 'jan27_39', 'mix']);

function renderPayoffToggles() {
  const html = Object.entries(PAYOFF_STRUCTS).map(([k, s]) =>
    \`<button class="toggle \${activePayoffs.has(k)?'active':''}" data-key="\${k}" style="\${activePayoffs.has(k)?'background:'+s.color+'; border-color:'+s.color+';':''}">\${s.label}</button>\`
  ).join('');
  const el = document.getElementById('payoff-toggles');
  el.innerHTML = html;
  el.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      const k = b.dataset.key;
      if (activePayoffs.has(k)) activePayoffs.delete(k);
      else activePayoffs.add(k);
      renderPayoffToggles();
      renderPayoff();
    });
  });
}
renderPayoffToggles();

function renderPayoff() {
  const canvas = document.getElementById('payoffChart');
  const { ctx, w, h } = hidpi(canvas);
  ctx.clearRect(0, 0, w, h);

  const padL = 56, padR = 16, padT = 16, padB = 36;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const xMin = 22, xMax = 55;
  const xs = [];
  for (let i = 0; i <= 100; i++) xs.push(xMin + (xMax - xMin) * i / 100);

  function payoff(struct, spot) {
    if (struct.mix) {
      const v35 = Math.max(0, spot - 35);
      const v39 = Math.max(0, spot - 39);
      const totalValue = 40 * v35 * 100 + 25 * v39 * 100;
      const totalCost = 40 * STRIKES[0].mid * 100 + 25 * STRIKES[1].mid * 100;
      return ((totalValue - totalCost) / totalCost) * 100;
    }
    if (struct.verticalLower != null) {
      const v = Math.max(0, Math.min(spot, struct.verticalUpper) - struct.verticalLower);
      return ((v - struct.cost) / struct.cost) * 100;
    }
    const v = Math.max(0, spot - struct.strike);
    return ((v - struct.cost) / struct.cost) * 100;
  }

  // Collect series & y range
  const active = [...activePayoffs];
  let yMin = -110, yMax = 110;
  for (const k of active) {
    const struct = PAYOFF_STRUCTS[k];
    for (const x of xs) {
      const y = payoff(struct, x);
      if (y > yMax) yMax = y;
      if (y < yMin) yMin = y;
    }
  }
  // Pad y range
  yMax = Math.ceil(yMax / 100) * 100;
  yMin = Math.min(yMin, -100);

  function sx(x) { return padL + ((x - xMin) / (xMax - xMin)) * plotW; }
  function sy(y) { return padT + (1 - (y - yMin) / (yMax - yMin)) * plotH; }

  // Grid
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px ui-monospace';
  for (let x = 25; x <= xMax; x += 5) {
    ctx.beginPath();
    ctx.moveTo(sx(x), padT);
    ctx.lineTo(sx(x), padT + plotH);
    ctx.stroke();
    ctx.fillText('$' + x, sx(x) - 8, h - 12);
  }
  const yTicks = 6;
  for (let i = 0; i <= yTicks; i++) {
    const y = yMin + (yMax - yMin) * i / yTicks;
    ctx.beginPath();
    ctx.moveTo(padL, sy(y));
    ctx.lineTo(padL + plotW, sy(y));
    ctx.stroke();
    ctx.fillText((y >= 0 ? '+' : '') + y.toFixed(0) + '%', 8, sy(y) + 4);
  }

  // Zero / breakeven line
  ctx.strokeStyle = '#8b949e';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padL, sy(0));
  ctx.lineTo(padL + plotW, sy(0));
  ctx.stroke();

  // Spot marker
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx(DATA.spot), padT);
  ctx.lineTo(sx(DATA.spot), padT + plotH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#58a6ff';
  ctx.fillText('spot $' + DATA.spot.toFixed(2), sx(DATA.spot) + 4, padT + 12);

  // Series
  ctx.lineWidth = 2.5;
  for (const k of active) {
    const struct = PAYOFF_STRUCTS[k];
    ctx.strokeStyle = struct.color;
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      const y = payoff(struct, x);
      const px = sx(x), py = sy(y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

// -- Skew chart --
function renderSkew() {
  const canvas = document.getElementById('skewChart');
  const { ctx, w, h } = hidpi(canvas);
  ctx.clearRect(0, 0, w, h);

  const padL = 48, padR = 16, padT = 16, padB = 36;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const chain = DATA.chainSnapshot.jan27.filter(q => q.iv != null);
  const strikes = chain.map(q => q.strike);
  const ivs = chain.map(q => q.iv * 100);
  const xMin = Math.min(...strikes), xMax = Math.max(...strikes);
  const yMin = Math.floor(Math.min(...ivs)) - 1;
  const yMax = Math.ceil(Math.max(...ivs)) + 1;

  function sx(x) { return padL + ((x - xMin) / (xMax - xMin)) * plotW; }
  function sy(y) { return padT + (1 - (y - yMin) / (yMax - yMin)) * plotH; }

  ctx.strokeStyle = '#30363d';
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px ui-monospace';
  for (const x of strikes) {
    ctx.beginPath(); ctx.moveTo(sx(x), padT); ctx.lineTo(sx(x), padT + plotH); ctx.stroke();
    ctx.fillText('$' + x, sx(x) - 8, h - 12);
  }
  for (let y = yMin; y <= yMax; y += 1) {
    ctx.beginPath(); ctx.moveTo(padL, sy(y)); ctx.lineTo(padL + plotW, sy(y)); ctx.stroke();
    if (y % 2 === 0) ctx.fillText(y.toFixed(0) + '%', 8, sy(y) + 4);
  }

  // Skew line
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < chain.length; i++) {
    const px = sx(strikes[i]), py = sy(ivs[i]);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = '#58a6ff';
  for (let i = 0; i < chain.length; i++) {
    ctx.beginPath(); ctx.arc(sx(strikes[i]), sy(ivs[i]), 3, 0, Math.PI * 2); ctx.fill();
  }
}

// -- DBA price chart --
function renderDba() {
  const canvas = document.getElementById('dbaChart');
  const { ctx, w, h } = hidpi(canvas);
  ctx.clearRect(0, 0, w, h);
  const data = DATA.dbaHistory;
  if (!data.length) return;
  const padL = 48, padR = 16, padT = 16, padB = 36;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const closes = data.map(d => d.close);
  const yMin = Math.floor(Math.min(...closes) * 10) / 10 - 0.2;
  const yMax = Math.ceil(Math.max(...closes) * 10) / 10 + 0.2;
  function sx(i) { return padL + (i / (data.length - 1)) * plotW; }
  function sy(y) { return padT + (1 - (y - yMin) / (yMax - yMin)) * plotH; }
  ctx.strokeStyle = '#30363d';
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px ui-monospace';
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const y = yMin + (yMax - yMin) * i / ySteps;
    ctx.beginPath(); ctx.moveTo(padL, sy(y)); ctx.lineTo(padL + plotW, sy(y)); ctx.stroke();
    ctx.fillText('$' + y.toFixed(2), 8, sy(y) + 4);
  }
  // X ticks: 6 evenly spaced
  for (let i = 0; i < 6; i++) {
    const idx = Math.round((data.length - 1) * i / 5);
    ctx.fillText(data[idx].date.slice(2), sx(idx) - 18, h - 12);
  }
  // Line
  ctx.strokeStyle = '#3fb950';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const px = sx(i), py = sy(data[i].close);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

// -- Probability table --
const probRows = Object.entries(DATA.probAbove).map(([name, ps]) => {
  const vol = DATA.volScenarios[name];
  const label = name + ' (' + (vol*100).toFixed(0) + '%)';
  function p(t) { return ps[t] != null ? (ps[t]*100).toFixed(1) + '%' : '—'; }
  return \`<tr><td>\${label}</td><td class="mono">\${p(30)}</td><td class="mono">\${p(33)}</td><td class="mono">\${p(35)}</td><td class="mono">\${p(39)}</td><td class="mono">\${p(45)}</td><td class="mono">\${p(50)}</td></tr>\`;
}).join('');
document.getElementById('prob-rows').innerHTML = probRows;

// -- EV table --
const evRows = Object.entries(DATA.evAnalysis).map(([k, vals]) => {
  function pill(v) {
    let cls = 'pill-red';
    if (v >= 3) cls = 'pill-green';
    else if (v >= 1.5) cls = 'pill-yellow';
    else if (v >= 1) cls = 'pill-orange';
    return \`<span class="pill \${cls}">\${v.toFixed(2)}x</span>\`;
  }
  return \`<tr><td>\${k.replace('jan27_', 'Jan27 $')}</td><td>\${pill(vals.rv30)}</td><td>\${pill(vals.iv_current)}</td><td>\${pill(vals.el_nino_analog)}</td><td>\${pill(vals.food_inflation_2022)}</td></tr>\`;
}).join('');
document.getElementById('ev-rows').innerHTML = evRows;

// -- Convexity table --
const convRows = DATA.convexityRanking.map(c =>
  \`<tr><td>\${c.label}</td><td class="mono">$\${c.mid.toFixed(2)}</td><td class="mono">\${c.gammaPerDollar.toFixed(4)}</td><td class="mono">\${c.vegaPerDollar.toFixed(4)}</td></tr>\`
).join('');
document.getElementById('conv-rows').innerHTML = convRows;

// -- Chain table --
const chainRows = DATA.chainSnapshot.jan27.map(q => {
  const be = q.mid != null ? q.strike + q.mid : null;
  const highlight = q.strike === 35 || q.strike === 39 ? ' class="highlight-row"' : '';
  return \`<tr\${highlight}><td><strong>$\${q.strike}</strong></td><td class="mono">$\${(q.mid??0).toFixed(2)}</td><td class="mono">\${((q.iv??0)*100).toFixed(1)}%</td><td class="mono">\${(q.delta??0).toFixed(3)}</td><td class="mono">\${(q.gamma??0).toFixed(4)}</td><td class="mono">\${(q.theta??0).toFixed(4)}</td><td class="mono">\${(q.vega??0).toFixed(3)}</td><td class="mono">\${q.open_interest??0}</td><td class="mono">\${q.volume??0}</td><td class="mono">$\${be?be.toFixed(2):'—'}</td></tr>\`;
}).join('');
document.getElementById('chain-rows').innerHTML = chainRows;

// -- Recommended structure payoff --
const recRows = [30, 35, 40, 45, 50].map(spot => {
  const v35 = Math.max(0, spot - 35);
  const v39 = Math.max(0, spot - 39);
  const totalValue = 40 * v35 * 100 + 25 * v39 * 100;
  const totalCost = 40 * STRIKES[0].mid * 100 + 25 * STRIKES[1].mid * 100;
  const mult = totalValue / totalCost;
  return \`<tr><td class="mono">$\${spot}</td><td class="mono">$\${totalValue.toFixed(0)}</td><td class="mono">\${mult.toFixed(2)}x</td></tr>\`;
}).join('');
document.getElementById('rec-rows').innerHTML = recRows;

// Initial renders — defer to next frame so layout settles
function renderAll() { renderPayoff(); renderSkew(); renderDba(); }
updateSim();
requestAnimationFrame(() => requestAnimationFrame(renderAll));
window.addEventListener('resize', renderAll);
window.addEventListener('load', () => requestAnimationFrame(renderAll));
</script>
</body>
</html>
`;

const outPath = resolve(import.meta.dir, "..", "reports", "dba-el-nino.html");
writeFileSync(outPath, html);
console.log(`✓ wrote ${outPath} (${html.length} chars, ${PAYLOAD.length} chars of embedded data)`);
