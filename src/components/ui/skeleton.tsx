import { cn } from "@/lib/utils"

/**
 * Skeleton — placeholder loading element.
 *
 * Uses a neutral muted tone (not the brand accent) so loading states read
 * as "data is on its way" rather than "green glow". The shimmer is subtle
 * and slate-only, matching Bloomberg / Linear / Vercel terminal aesthetics.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Neutral slate shimmer — not brand-tinted
        "bg-muted/60 dark:bg-slate-700/40",
        "animate-pulse rounded-md",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
