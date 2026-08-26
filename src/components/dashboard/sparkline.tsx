"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  /** Series of numeric values (any length; recommend 20 points). */
  data: number[];
  /** Width in px. */
  width?: number;
  /** Height in px. */
  height?: number;
  /** Stroke color CSS value. If omitted, auto from trend. */
  color?: string;
  /** Render a soft gradient fill under the line. */
  fill?: boolean;
  /** Stroke width. */
  strokeWidth?: number;
  className?: string;
  /** Render a small dot at the last point. */
  showLastDot?: boolean;
  ariaLabel?: string;
}

/**
 * Tiny inline SVG sparkline. No external deps — hand-rolled for performance
 * and visual control. This is the signature "real trading platform" visual
 * element. Auto-detects up/down trend from first → last value when no color
 * is supplied.
 */
export function Sparkline({
  data,
  width = 80,
  height = 28,
  color,
  fill = true,
  strokeWidth = 1.5,
  className,
  showLastDot = true,
  ariaLabel,
}: SparklineProps) {
  // Hooks must run before any early return — call this unconditionally.
  const gradId = React.useId();

  if (!data || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        role="img"
        aria-label={ariaLabel ?? "no data"}
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth + 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const up = data[data.length - 1] >= data[0];
  const stroke =
    color ??
    (up
      ? "oklch(0.78 0.19 162)" // emerald-400
      : "oklch(0.72 0.22 18)"); // rose-400

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");

  const fillPath =
    `M${points[0][0].toFixed(2)} ${(height - pad).toFixed(2)} ` +
    points.map(([x, y]) => `L${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") +
    ` L${points[points.length - 1][0].toFixed(2)} ${(height - pad).toFixed(2)} Z`;

  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={ariaLabel ?? `sparkline, ${up ? "up" : "down"} ${((data[data.length - 1] / data[0] - 1) * 100).toFixed(2)}%`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={fillPath} fill={`url(#${gradId})`} stroke="none" />}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLastDot && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={strokeWidth + 0.6}
          fill={stroke}
          stroke="var(--background)"
          strokeWidth={0.8}
        />
      )}
    </svg>
  );
}

/**
 * Deterministic pseudo-random sparkline generator.
 * Lets us show a realistic-looking sparkline per ticker without an extra
 * network round-trip — shape is seeded from the symbol + current price +
 * 24h change % so it stays stable across re-renders but visually reflects
 * each ticker's actual market direction.
 */
export function synthesizeSeries(
  seed: string,
  basePrice: number,
  changePct: number,
  points = 20
): number[] {
  // FNV-1a hash for a stable numeric seed
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const rand = (() => {
    let s = h >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  })();

  // Generate a path that trends toward `changePct` over `points` samples,
  // with realistic noise and a slight "ramp into close" shape.
  const trend = changePct / 100;
  const arr: number[] = [];
  let v = basePrice / (1 + trend); // implied open
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const drift = trend * progress * basePrice;
    const noise = (rand() - 0.5) * basePrice * 0.008;
    v = basePrice / (1 + trend) + drift + noise;
    arr.push(Math.max(0, v));
  }
  // Force last point to the actual current price
  arr[arr.length - 1] = basePrice;
  return arr;
}
