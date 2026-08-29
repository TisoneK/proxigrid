"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useExchanges } from "@/hooks/use-exchanges";
import { useExchange } from "@/hooks/use-exchange";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

/**
 * Providers on the roadmap but not yet live. Selecting one just teases it —
 * the app stays purely on the active exchange. Wiring a provider up (an adapter
 * + registry entry) moves it out of this list into the live section on its own.
 */
const COMING_SOON = [
  { code: "coinbase", name: "Coinbase" },
  { code: "kraken", name: "Kraken" },
  { code: "deriv", name: "Deriv" },
];

/**
 * Picks the market-data exchange. Live providers (from /api/exchanges) are
 * selectable; roadmap providers show under "Coming soon" and pop a teaser.
 */
export function ExchangeSwitcher() {
  const { data: exchanges } = useExchanges();
  const [exchange, setExchange] = useExchange();
  const live = exchanges ?? [];
  const liveCodes = new Set(live.map((e) => e.code));
  const current = live.find((e) => e.code === exchange)?.name ?? "Binance";
  const soon = COMING_SOON.filter((e) => !liveCodes.has(e.code));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Select exchange"
          className="inline-flex items-center gap-1.5 h-7 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {current}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup value={exchange} onValueChange={setExchange}>
          {live.map((e) => (
            <DropdownMenuRadioItem key={e.code} value={e.code} className="text-xs">
              {e.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {soon.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
              Coming soon
            </DropdownMenuLabel>
            {soon.map((e) => (
              <DropdownMenuItem
                key={e.code}
                onSelect={() => {
                  toast(`${e.name} — coming soon`, {
                    description: "More exchanges are on the way. Proxigrid runs on Binance for now.",
                  });
                }}
                className="text-xs justify-between text-muted-foreground focus:text-muted-foreground"
              >
                {e.name}
                <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  Soon
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
