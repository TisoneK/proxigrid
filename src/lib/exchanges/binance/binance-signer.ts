/**
 * Proxigrid — Binance HMAC-SHA256 request signer
 *
 * Per the Binance API manual: every signed request must include:
 *   - X-MBX-APIKEY header (the API key itself)
 *   - signature query param = HMAC-SHA256(queryString, apiSecret)
 *
 * This module is isolated so signing logic can be unit tested independently
 * and reused across REST + WebSocket authenticated streams.
 */

import crypto from "crypto";

/**
 * Sign a query string with the API secret using HMAC-SHA256.
 * @returns hex-encoded signature
 */
export function signQueryString(queryString: string, apiSecret: string): string {
  if (!apiSecret) {
    throw new Error("Cannot sign request: apiSecret is missing");
  }
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
}

/**
 * Build the full signed query string for a Binance private request.
 *
 * @param params  Public + private params (timestamp/recvWindow auto-added if missing)
 * @param apiSecret
 * @returns Query string WITHOUT leading "?", including signature=...
 */
export function buildSignedQuery(
  params: Record<string, string | number | boolean | undefined>,
  apiSecret: string
): string {
  const merged: Record<string, string> = {};

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    merged[k] = String(v);
  }

  // Binance requires a timestamp in milliseconds
  if (!("timestamp" in merged)) {
    merged.timestamp = Date.now().toString();
  }
  if (!("recvWindow" in merged)) {
    merged.recvWindow = "5000";
  }

  const search = new URLSearchParams(merged).toString();
  const signature = signQueryString(search, apiSecret);
  return `${search}&signature=${signature}`;
}

/**
 * Verify an incoming signature (useful for webhook handlers).
 */
export function verifySignature(
  payload: string,
  signature: string,
  apiSecret: string
): boolean {
  const expected = signQueryString(payload, apiSecret);
  try {
    // Length-constant comparison
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
