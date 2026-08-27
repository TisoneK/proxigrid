import { coinColor } from "@/lib/coins";
import { cn } from "@/lib/utils";

interface CoinAvatarProps {
  /** Base asset symbol, e.g. "BTC". */
  base: string;
  size?: number;
  className?: string;
}

/**
 * Monogram avatar for a coin — a soft tinted disc with the asset's initials.
 * Stands in for a logo (we don't ship logo assets) while still giving each
 * market a recognizable, colorful identity.
 */
export function CoinAvatar({ base, size = 36, className }: CoinAvatarProps) {
  const color = coinColor(base);
  const label = base.slice(0, base.length <= 4 ? base.length : 3);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * (label.length > 2 ? 0.3 : 0.38)),
        color,
        backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in oklch, ${color} 32%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
