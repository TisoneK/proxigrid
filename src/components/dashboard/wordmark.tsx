import { cn } from "@/lib/utils";

/**
 * The Proxigrid wordmark as a self-contained SVG. Uses the app's Geist font at
 * bold with tracking-tight to match the brand exactly; "Proxi" is the brand
 * green (--primary) and "grid" inherits the text color, so both stay
 * theme-aware. The viewBox is sized to Geist's metrics so nothing clips. Set
 * the size via a height class on `className`.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 29.5 426 100.5"
      role="img"
      aria-label="Proxigrid"
      className={cn("w-auto", className)}
      preserveAspectRatio="xMinYMid meet"
    >
      <text
        x="0"
        y="100.5"
        fontSize="100"
        fontWeight="700"
        letterSpacing="-2.5"
        fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
      >
        <tspan style={{ fill: "var(--primary)" }}>Proxi</tspan>
        <tspan fill="currentColor">grid</tspan>
      </text>
    </svg>
  );
}
