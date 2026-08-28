"use client";

import * as React from "react";
import { useSignals } from "@/hooks/use-signals";
import { coinIdentity } from "@/lib/coins";
import { toast } from "sonner";
import { OrderConfirmDialog, type OrderIntent } from "@/components/dashboard/order-confirm-dialog";

/** Only surface directional signals at/above this strength. */
const STRENGTH_THRESHOLD = 0.5;
/** Ignore signals older than this (avoid alerting on stale backlog). */
const MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Watches the live signal feed and, when a strong new buy/sell signal appears,
 * raises a toast with a one-click "Place order" action. Mount once (globally).
 */
export function OpportunityWatcher() {
  const { data: signals } = useSignals(50);
  const seen = React.useRef<Set<string>>(new Set());
  const initialized = React.useRef(false);
  const [intent, setIntent] = React.useState<OrderIntent | null>(null);

  React.useEffect(() => {
    if (!signals) return;

    // First load: treat everything already in the feed as seen (no spam).
    if (!initialized.current) {
      for (const s of signals) seen.current.add(s.id);
      initialized.current = true;
      return;
    }

    for (const s of signals) {
      if (seen.current.has(s.id)) continue;
      seen.current.add(s.id);

      const dir = s.direction;
      if ((dir !== "long" && dir !== "short") || s.strength < STRENGTH_THRESHOLD) continue;
      if (Date.now() - new Date(s.createdAt).getTime() > MAX_AGE_MS) continue;

      const id = coinIdentity(s.symbol);
      const side: "buy" | "sell" = dir === "long" ? "buy" : "sell";
      toast(`${id.name}: ${side === "buy" ? "Buy" : "Sell"} opportunity`, {
        description: `${s.indicator} · ${(s.strength * 100).toFixed(0)}% confidence${s.note ? ` · ${s.note}` : ""}`,
        duration: 12000,
        action: {
          label: "Place order",
          onClick: () =>
            setIntent({
              symbol: s.symbol,
              side,
              price: s.price,
              reason: s.note ?? `${s.indicator} ${dir} signal`,
            }),
        },
      });
    }
  }, [signals]);

  return <OrderConfirmDialog intent={intent} onClose={() => setIntent(null)} />;
}
