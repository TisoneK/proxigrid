"use client";

import * as React from "react";
import { animate, useInView, useMotionValue } from "framer-motion";

interface CountUpProps {
  /** Target value (numeric). */
  value: number;
  /** Number of decimal places to display. */
  decimals?: number;
  /** Optional prefix, e.g. "$". */
  prefix?: string;
  /** Optional suffix, e.g. "%". */
  suffix?: string;
  /** Optional formatter. If provided, it overrides prefix/suffix/decimals. */
  format?: (n: number) => string;
  /** Animation duration in ms. */
  duration?: number;
  /** Disable animation (e.g. for SSR snapshots). */
  disabled?: boolean;
  className?: string;
}

/**
 * Animated number component for financial UI.
 * Renders inside a tabular-nums span so digits don't shift during the
 * count-up — a small but critical detail for trading dashboards.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  format,
  duration = 900,
  disabled = false,
  className,
}: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10px" });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = React.useState("0");

  const render = React.useCallback(
    (n: number) => {
      if (format) return format(n);
      const fixed = n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix}${fixed}${suffix}`;
    },
    [format, decimals, prefix, suffix]
  );

  React.useEffect(() => {
    if (disabled || !inView) {
      setDisplay(render(value));
      return;
    }
    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(render(v)),
    });
    return () => controls.stop();
  }, [value, inView, disabled, duration, motionValue, render]);

  // Render final value immediately if not yet in view (so SSR/no-JS gets real value).
  React.useEffect(() => {
    if (!inView) setDisplay(render(value));
  }, [value, inView, render]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {display}
    </span>
  );
}
