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
import { ExchangeLogo } from "@/components/dashboard/exchange-logo";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

/**
 * Providers on the roadmap but not yet live. Selecting one just teases it —
 * the app stays on the active exchange. Wiring a provider up (an adapter +
 * registry entry) moves it out of this list into the live section on its own.
 */
const COMING_SOON = [
  { code: "coinbase", name: "Coinbase" },
  { code: "kraken", name: "Kraken" },
  { code: "deriv", name: "Deriv" },
];

/**
 * The header's exchange badge, made clickable: it shows the active exchange
 * (logo · name · testnet) and opens a menu of live providers plus a
 * "Coming soon" list. Lives in the top bar so it reads as the app's exchange.
 */
export function ExchangeSwitcher() {
  const { data: exchanges } = useExchanges();
  const [exchange, setExchange] = useExchange();
  const live = exchanges ?? [];
  const liveCodes = new Set(live.map((e) => e.code));
  const current = live.find((e) => e.code === exchange);
  const currentName = current?.name ?? "Binance";
  const isPaper = current?.isPaper ?? true;
  const soon = COMING_SOON.filter((e) => !liveCodes.has(e.code));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Select exchange"
          className="hidden md:flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-secondary border border-border transition-colors hover:border-border/80"
        >
          <ExchangeLogo code={exchange} name={currentName} size={18} />
          <span className="text-xs font-medium text-foreground">{currentName}</span>
          {isPaper && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">testnet</span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup value={exchange} onValueChange={setExchange}>
          {live.map((e) => (
            <DropdownMenuRadioItem key={e.code} value={e.code} className="text-xs gap-2">
              <ExchangeLogo code={e.code} name={e.name} size={16} />
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
                <span className="flex items-center gap-2">
                  <ExchangeLogo code={e.code} name={e.name} size={16} className="opacity-70" />
                  {e.name}
                </span>
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
