/**
 * SQLite-backed HTTP cache for Polygon and FMP responses.
 *
 * Mirrors the pattern from options-rr (which uses bun:sqlite for state plus a
 * JSON-on-disk cache), but here we collapse both into a single SQLite file so
 * the entire run is reproducible from `out/cache.db`.
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve(import.meta.dir, "..", "out");
mkdirSync(OUT_DIR, { recursive: true });

const DB_PATH = resolve(OUT_DIR, "cache.db");

export const db = new Database(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS http_cache (
    url TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    status INTEGER NOT NULL,
    fetched_at INTEGER NOT NULL,
    ttl_ms INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS option_quotes (
    ticker TEXT NOT NULL,
    underlying TEXT NOT NULL,
    expiration TEXT NOT NULL,
    strike REAL NOT NULL,
    contract_type TEXT NOT NULL,
    bid REAL,
    ask REAL,
    mid REAL,
    last REAL,
    iv REAL,
    delta REAL,
    gamma REAL,
    theta REAL,
    vega REAL,
    open_interest INTEGER,
    volume INTEGER,
    underlying_price REAL,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY (ticker, fetched_at)
  );

  CREATE TABLE IF NOT EXISTS underlying_history (
    underlying TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    PRIMARY KEY (underlying, date)
  );

  CREATE TABLE IF NOT EXISTS iv_history (
    ticker TEXT NOT NULL,
    date TEXT NOT NULL,
    close REAL,
    iv REAL,
    PRIMARY KEY (ticker, date)
  );
`);

interface CacheRow {
  body: string;
  status: number;
  fetched_at: number;
  ttl_ms: number;
}

export function getCached(url: string): { body: string; status: number } | null {
  const row = db
    .query<CacheRow, [string]>(
      `SELECT body, status, fetched_at, ttl_ms FROM http_cache WHERE url = ?`
    )
    .get(url);
  if (!row) return null;
  if (row.ttl_ms > 0 && Date.now() - row.fetched_at > row.ttl_ms) return null;
  return { body: row.body, status: row.status };
}

export function putCached(
  url: string,
  body: string,
  status: number,
  ttlMs: number
): void {
  db.query(
    `INSERT OR REPLACE INTO http_cache (url, body, status, fetched_at, ttl_ms) VALUES (?, ?, ?, ?, ?)`
  ).run(url, body, status, Date.now(), ttlMs);
}
