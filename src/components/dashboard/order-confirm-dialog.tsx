"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoinLogo } from "@/components/dashboard/coin-logo";
import { coinIdentity } from "@/lib/coins";
import { formatPrice } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface OrderIntent {
  symbol: string;
  side: "buy" | "sell";
  /** Reference price (from the signal) for display. */
  price: number;
  /** Why this order is suggested (e.g. the signal note). */
  reason?: string;
}

export function OrderConfirmDialog({
  intent,
  onClose,
}: {
  intent: OrderIntent | null;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = React.useState("0.001");
  const [placing, setPlacing] = React.useState(false);

  const id = intent ? coinIdentity(intent.symbol) : null;
  const buy = intent?.side === "buy";

  const place = async () => {
    if (!intent) return;
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchange: "binance",
          symbol: intent.symbol,
          side: intent.side,
          type: "market",
          quantity: parseFloat(quantity),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`Order failed: ${data.error ?? res.status}`);
      } else if (data.status === "skipped") {
        toast.warning("Order skipped", { description: data.detail });
      } else {
        toast.success(`Order placed — ${intent.side} ${quantity} ${intent.symbol}`);
      }
      onClose();
    } catch (e) {
      toast.error(`Order failed: ${(e as Error).message}`);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Dialog open={intent !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Place order</DialogTitle>
          <DialogDescription>Review and confirm before it&apos;s sent to Binance.</DialogDescription>
        </DialogHeader>

        {intent && id && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CoinLogo base={id.base} size={36} />
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {id.name}{" "}
                  <span className="text-muted-foreground">
                    {id.base}
                    {id.quote && `/${id.quote}`}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  ~ {formatPrice(intent.price)} · market order
                </div>
              </div>
              <span
                className={cn(
                  "ml-auto text-sm font-bold uppercase",
                  buy ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {intent.side}
              </span>
            </div>

            {intent.reason && (
              <p className="text-xs text-muted-foreground bg-secondary rounded-lg p-2 leading-relaxed">
                {intent.reason}
              </p>
            )}

            <div className="[&_label]:block [&_label]:mb-1.5">
              <Label htmlFor="order-qty">Quantity ({id.base})</Label>
              <Input
                id="order-qty"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Requires <code>ENABLE_LIVE_TRADING</code> + API keys on the server; otherwise this is
              safely skipped.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={placing}>
            Cancel
          </Button>
          <Button
            onClick={place}
            disabled={placing}
            className={cn("text-white", buy ? "bg-emerald-600 hover:bg-emerald-600/90" : "bg-rose-600 hover:bg-rose-600/90")}
          >
            {placing ? "Placing…" : `Confirm ${buy ? "buy" : "sell"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
