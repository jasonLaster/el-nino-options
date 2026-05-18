import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(import.meta.dir, "..", ".env.local"), quiet: true });
dotenv.config({ quiet: true });

export const POLYGON_API_KEY =
  process.env.POLYGON_API_KEY || process.env.MASSIVE_API_KEY || "";
export const FMP_API_KEY = process.env.FMP_API_KEY || "";

if (!POLYGON_API_KEY) {
  console.warn("Warning: POLYGON_API_KEY not set");
}
if (!FMP_API_KEY) {
  console.warn("Warning: FMP_API_KEY not set");
}
