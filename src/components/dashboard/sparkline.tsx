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

