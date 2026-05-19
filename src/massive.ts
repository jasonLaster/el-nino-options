/**
 * Massive API client — uses POLYGON_API_KEY against https://api.massive.com.
 * Massive mirrors Polygon's REST shape; key difference is higher free-tier
 * rate limits and access to the bulk snapshot endpoint that returns the
 * entire option chain (with greeks + quotes + IV) in one call.
 */

import { fetchJson } from "./http.ts";
import { POLYGON_API_KEY } from "./env.ts";

const BASE = "https://api.massive.com";
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function withKey(u: URL): URL {
  u.searchParams.set("apiKey", POLYGON_API_KEY);
  return u;
}

export interface ChainContract {
  break_even_price?: number;
  day?: {
    change?: number;
    change_percent?: number;
    close?: number;
    high?: number;
    last_updated?: number;
    low?: number;
    open?: number;
    previous_close?: number;
    volume?: number;
    vwap?: number;
  };
  details?: {
    contract_type?: "call" | "put";
    exercise_style?: string;
    expiration_date?: string;
    shares_per_contract?: number;
    strike_price?: number;
    ticker?: string;
  };
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
  implied_volatility?: number;
  last_quote?: {
    ask?: number;
    ask_size?: number;
    bid?: number;
    bid_size?: number;
    last_updated?: number;
    midpoint?: number;
    timeframe?: string;
  };
  last_trade?: {
    conditions?: number[];
    exchange?: number;
    price?: number;
    sip_timestamp?: number;
    size?: number;
    timeframe?: string;
  };
  open_interest?: number;
  underlying_asset?: {
    change_to_break_even?: number;
    last_updated?: number;
    price?: number;
    ticker?: string;
    timeframe?: string;
  };
}

interface ChainResponse {
  results?: ChainContract[];
  status?: string;
  request_id?: string;
  next_url?: string;
}

/**
 * Bulk option chain snapshot — returns ALL contracts for a ticker in one call,
 * with optional filters. This is the efficiency unlock vs per-contract fetches.
 */
export async function getOptionsChainSnapshot(
  underlying: string,
  filters: {
    expiration?: string;
    contractType?: "call" | "put";
    strikeMin?: number;
    strikeMax?: number;
    limit?: number;
  } = {}
): Promise<ChainContract[]> {
  const url = new URL(`${BASE}/v3/snapshot/options/${underlying}`);
  if (filters.expiration) url.searchParams.set("expiration_date", filters.expiration);
  if (filters.contractType) url.searchParams.set("contract_type", filters.contractType);
  if (filters.strikeMin != null)
    url.searchParams.set("strike_price.gte", String(filters.strikeMin));
  if (filters.strikeMax != null)
    url.searchParams.set("strike_price.lte", String(filters.strikeMax));
  url.searchParams.set("limit", String(filters.limit ?? 250));
  withKey(url);

  const results: ChainContract[] = [];
  let next: string | null = url.toString();
  while (next) {
    const data = await fetchJson<ChainResponse>(next, { ttlMs: HOUR_MS });
    if (data.results) results.push(...data.results);
    if (data.next_url) {
      const u = new URL(data.next_url);
      next = withKey(u).toString();
    } else {
      next = null;
    }
  }
  return results;
}

/**
 * Equity snapshot — returns price + day info for an underlying.
 */
export async function getEquityLastPrice(ticker: string): Promise<number | null> {
  const url = new URL(`${BASE}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
  withKey(url);
  try {
    const data = await fetchJson<{
      ticker?: {
        day?: { c?: number };
        lastTrade?: { p?: number };
        min?: { c?: number };
        prevDay?: { c?: number };
      };
    }>(url.toString(), { ttlMs: HOUR_MS });
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

/**
 * Daily aggregates for an equity or option.
 */
export async function getAggregatesMassive(
  ticker: string,
  from: string,
  to: string
): Promise<Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>> {
  const url = new URL(
    `${BASE}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}`
  );
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "50000");
  withKey(url);
  const data = await fetchJson<{ results?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }> }>(
    url.toString(),
    { ttlMs: DAY_MS }
  );
  return data.results ?? [];
}
