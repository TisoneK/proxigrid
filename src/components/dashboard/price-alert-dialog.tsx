"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRule } from "@/hooks/use-automation-rules";
import { coinIdentity } from "@/lib/coins";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AlertIntent {
  symbol: string;
  price: number;
}

/**
 * Consumer-friendly "notify me when <coin> crosses <price>" flow. Composes an
 * automation rule (price condition + in-app notify action) via useCreateRule —
 * the same engine the sweep worker evaluates.
 */
export function PriceAlertDialog({
  intent,
  onClose,
}: {
  intent: AlertIntent | null;
  onClose: () => void;
}) {
  const [direction, setDirection] = React.useState<"above" | "below">("above");
  const [target, setTarget] = React.useState("");
  // Seed the form when a new intent opens. The parent passes a fresh object on
  // every open, so comparing by reference reseeds each time (and stays lint-clean
  // vs. setState-in-effect — this adjusts state during render, not in an effect).
  const [seededFor, setSeededFor] = React.useState<AlertIntent | null>(null);
  const create = useCreateRule();

  const id = intent ? coinIdentity(intent.symbol) : null;

  if (intent && intent !== seededFor) {
    setSeededFor(intent);
    setDirection("above");
    setTarget(String(intent.price));
  }

  const value = parseFloat(target);
  const valid = intent !== null && Number.isFinite(value) && value > 0;

  const handleCreate = () => {
    if (!intent || !valid) {
      toast.error("Enter a valid target price");
      return;
    }
    const operator = direction === "above" ? ">=" : "<=";
    const label = `${id?.base} ${direction} ${formatPrice(value)}`;
    create.mutate(
      {
        name: label,
        description: `Price alert — notify when ${intent.symbol} is ${operator} ${value}`,
        trigger: {
          exchange: "binance",
          symbol: intent.symbol,
          timeframe: "1h",
          matchMode: "all",
          conditions: [{ type: "price", operator, value }],
        },
        action: { type: "notify", channel: "in_app" },
        // Alerts are announcements, not repeating automations — long cooldown
        // so a hovering price doesn't spam once it crosses.
        cooldownSec: 3600,
      },
      {
        onSuccess: () => {
          toast.success("Price alert set", { description: label });
          onClose();
        },
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  return (
    <Dialog open={intent !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm border-border/60">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Set price alert{id ? ` — ${id.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Get an in-app notification when the price crosses your target.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-secondary">
            <DirTab active={direction === "above"} onClick={() => setDirection("above")}>
              Rises above
            </DirTab>
            <DirTab active={direction === "below"} onClick={() => setDirection("below")}>
              Falls below
            </DirTab>
          </div>

          <div className="[&_label]:block [&_label]:mb-1.5">
            <Label htmlFor="alert-target">Target price (USDT)</Label>
            <Input
              id="alert-target"
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
            />
            {intent && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Current price {formatPrice(intent.price)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={create.isPending || !valid}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {create.isPending ? "Setting…" : "Set alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DirTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "py-2 rounded-md text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
