"use client";

import * as React from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { CoinDetailDialog } from "@/components/dashboard/coin-detail-dialog";
import { useTickers, type Ticker } from "@/hooks/use-ticker";
import { useGenerateSignals } from "@/hooks/use-signals";
import { coinIdentity } from "@/lib/coins";
import { formatPrice } from "@/lib/utils/format";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Sparkles, SunMoon } from "lucide-react";

/** ⌘K / Ctrl-K command palette — jump to a coin or run a quick action. */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Ticker | null>(null);
  const { data: tickers } = useTickers("binance");
  const { setTheme, resolvedTheme } = useTheme();
  const generate = useGenerateSignals();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("proxigrid:command", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("proxigrid:command", onOpen);
    };
  }, []);

  const openCoin = (t: Ticker) => {
    setOpen(false);
    setDetail(t);
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search coins or run a command…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem
              value="toggle theme dark light"
              onSelect={() => {
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
                setOpen(false);
              }}
            >
              <SunMoon className="mr-2 h-4 w-4" />
              Toggle theme
            </CommandItem>
            <CommandItem
              value="scan btc bitcoin signals generate"
              onSelect={() => {
                generate.mutate(
                  { exchange: "binance", symbol: "BTCUSDT", timeframe: "1h" },
                  {
                    onSuccess: (d) => toast.success(`Generated ${d.signals?.length ?? 0} signals for BTC`),
                    onError: (e) => toast.error(`Scan failed: ${(e as Error).message}`),
                  }
                );
                setOpen(false);
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Scan BTC for signals
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Markets">
            {(tickers ?? []).slice(0, 40).map((t) => {
              const id = coinIdentity(t.symbol);
              return (
                <CommandItem
                  key={t.symbol}
                  value={`${id.name} ${id.base} ${t.symbol}`}
                  onSelect={() => openCoin(t)}
                >
                  <span className="font-medium">{id.name}</span>
                  <span className="ml-1.5 text-muted-foreground text-xs">
                    {id.base}
                    {id.quote && `/${id.quote}`}
                  </span>
                  <span className="ml-auto tabular-nums text-muted-foreground text-xs">
                    {formatPrice(t.price)}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <CoinDetailDialog ticker={detail} onClose={() => setDetail(null)} />
    </>
  );
}
