/**
 * Proxigrid — Binance request signer (HMAC-SHA256 and Ed25519)
 *
 * Per the Binance API manual, every signed request carries:
 *   - the X-MBX-APIKEY header (the API key)
 *   - a `signature` query param over the exact query string that is sent
 *
 * Two signing schemes are supported:
 *   - HMAC-SHA256 (symmetric shared secret) — hex-encoded signature
 *   - Ed25519 (asymmetric, the manual's recommended scheme) — the raw
 *     signature bytes, base64-encoded (and URL-encoded when placed in the query)
 *
 * Isolated here so signing can be unit-tested and reused across REST + WS.
 */

import crypto from "crypto";

export type SigningCredential =
  | { method: "hmac"; apiSecret: string }
  | { method: "ed25519"; privateKeyPem: string };

/**
 * Sign an arbitrary payload with the given credential.
 * @returns hex (HMAC) or base64 (Ed25519) encoded signature
 */
export function signPayload(payload: string, cred: SigningCredential): string {
  if (cred.method === "hmac") {
    if (!cred.apiSecret) throw new Error("Cannot sign request: apiSecret is missing");
    return crypto.createHmac("sha256", cred.apiSecret).update(payload).digest("hex");
  }
  // Ed25519: `null` algorithm tells Node to use the key's own (EdDSA) scheme.
  if (!cred.privateKeyPem) throw new Error("Cannot sign request: Ed25519 private key is missing");
  const key = crypto.createPrivateKey({ key: cred.privateKeyPem });
  const signature = crypto.sign(null, Buffer.from(payload, "utf8"), key);
  return signature.toString("base64");
}

/** Backward-compatible HMAC helper (hex signature). */
export function signQueryString(queryString: string, apiSecret: string): string {
  return signPayload(queryString, { method: "hmac", apiSecret });
}

export interface SignedQueryOptions {
  /** Millisecond Unix timestamp to embed (already clock-offset-corrected). */
  timestamp?: number;
  /** recvWindow in ms (default 5000, Binance max 60000). */
  recvWindow?: number;
}

/**
 * Build the full signed query string for a Binance private request.
 *
 * @returns Query string WITHOUT leading "?", including signature=... The
 *   signature is URL-encoded so base64 (Ed25519) values remain valid.
 */
export function buildSignedQuery(
  params: Record<string, string | number | boolean | undefined>,
  cred: SigningCredential,
  opts: SignedQueryOptions = {}
): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    merged[k] = String(v);
  }

  // Every signed request needs a millisecond timestamp; recvWindow is capped
  // at 60000 by Binance (default 5000).
  if (!("timestamp" in merged)) {
    merged.timestamp = String(opts.timestamp ?? Date.now());
  }
  if (!("recvWindow" in merged)) {
    merged.recvWindow = String(Math.min(opts.recvWindow ?? 5000, 60000));
  }

  const search = new URLSearchParams(merged).toString();
  const signature = signPayload(search, cred);
  return `${search}&signature=${encodeURIComponent(signature)}`;
}

/**
 * Verify an incoming HMAC signature (e.g. for webhook handlers), using a
 * length-constant comparison.
 */
export function verifySignature(
  payload: string,
  signature: string,
  apiSecret: string
): boolean {
  const expected = signQueryString(payload, apiSecret);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
