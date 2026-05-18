/**
 * Polygon REST helpers for options + equities.
 * Docs: https://polygon.io/docs
 */

import { fetchJson } from "./http.ts";
import { POLYGON_API_KEY } from "./env.ts";

const BASE = "https://api.polygon.io";
const DAY_MS = 24 * 60 * 60 * 1000;

interface PolygonResult<T> {
  status?: string;
  results?: T;
  next_url?: string;
  error?: string;
}

function withKey(url: string): string {
  const u = new URL(url);
  u.searchParams.set("apiKey", POLYGON_API_KEY);
  return u.toString();
}

export interface OptionContract {
  ticker: string;
  underlying_ticker: string;
  expiration_date: string;
  strike_price: number;
  contract_type: "call" | "put";
  shares_per_contract?: number;
}

export async function listOptionContracts(
  underlying: string,
  expiration: string,
  contractType: "call" | "put" = "call"
): Promise<OptionContract[]> {
  const out: OptionContract[] = [];
  let url = `${BASE}/v3/reference/options/contracts?underlying_ticker=${underlying}&expiration_date=${expiration}&contract_type=${contractType}&limit=250&apiKey=${POLYGON_API_KEY}`;
  while (url) {
    const data = await fetchJson<PolygonResult<OptionContract[]>>(url, { ttlMs: DAY_MS });
    if (data.results) out.push(...data.results);
    url = data.next_url ? withKey(data.next_url) : "";
  }
  return out;
}

export interface SnapshotGreeks {
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface SnapshotDay {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  vwap?: number;
  change?: number;
  change_percent?: number;
  previous_close?: number;
}

export interface SnapshotLastQuote {
  bid?: number;
  ask?: number;
  bid_size?: number;
  ask_size?: number;
  midpoint?: number;
}

export interface SnapshotLastTrade {
  price?: number;
  size?: number;
}

export interface SnapshotDetails {
  contract_type?: string;
  expiration_date?: string;
  strike_price?: number;
}

export interface SnapshotUnderlying {
  price?: number;
  ticker?: string;
}

export interface OptionSnapshot {
  break_even_price?: number;
  day?: SnapshotDay;
  details?: SnapshotDetails;
  greeks?: SnapshotGreeks;
  implied_volatility?: number;
  last_quote?: SnapshotLastQuote;
  last_trade?: SnapshotLastTrade;
  open_interest?: number;
  underlying_asset?: SnapshotUnderlying;
}

export async function getOptionSnapshot(
  underlying: string,
  optionTicker: string
): Promise<OptionSnapshot | null> {
  const url = `${BASE}/v3/snapshot/options/${underlying}/${optionTicker}?apiKey=${POLYGON_API_KEY}`;
  try {
    const data = await fetchJson<PolygonResult<OptionSnapshot>>(url, { ttlMs: 60 * 60 * 1000 });
    return data.results ?? null;
  } catch (err) {
    console.warn(`  snapshot failed ${optionTicker}: ${(err as Error).message.slice(0, 100)}`);
    return null;
  }
}

export interface Aggregate {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw?: number;
}

export async function getAggregates(
  ticker: string,
  from: string,
  to: string,
  timespan: "day" | "week" = "day"
): Promise<Aggregate[]> {
  const url = `${BASE}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;
  const data = await fetchJson<{ results?: Aggregate[] }>(url, { ttlMs: DAY_MS });
  return data.results ?? [];
}

export async function getEquitySnapshot(ticker: string): Promise<number | null> {
  const url = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`;
  try {
    const data = await fetchJson<{ ticker?: { day?: { c?: number }; lastTrade?: { p?: number }; min?: { c?: number }; prevDay?: { c?: number } } }>(url, {
      ttlMs: 60 * 60 * 1000,
    });
    return (
      data.ticker?.day?.c ??
      data.ticker?.min?.c ??
      data.ticker?.lastTrade?.p ??
      data.ticker?.prevDay?.c ??
      null
    );
  } catch {
    return null;
  }
}
