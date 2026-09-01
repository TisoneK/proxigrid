/**
 * Query-param helpers for API routes: parse an integer with a fallback for
 * missing/invalid values and clamp into a sane range, so `?limit=NaN`,
 * negatives, or unbounded values never reach Prisma or an exchange client.
 */
export function intParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (raw === null) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
