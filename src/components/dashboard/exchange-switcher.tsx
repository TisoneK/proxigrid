"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExchanges } from "@/hooks/use-exchanges";
import { useExchange } from "@/hooks/use-exchange";

/**
 * Picks the market-data exchange the dashboard browses. Hidden when only one
 * exchange is registered. Extensible: any provider returned by /api/exchanges
 * (a new crypto exchange, or a forex/derivatives broker) shows up here.
 */
export function ExchangeSwitcher() {
  const { data: exchanges } = useExchanges();
  const [exchange, setExchange] = useExchange();
  const list = exchanges ?? [];
  if (list.length <= 1) return null;

  return (
    <Select value={exchange} onValueChange={setExchange}>
      <SelectTrigger
        className="h-7 w-auto gap-1.5 px-2.5 text-xs font-medium"
        aria-label="Select exchange"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {list.map((e) => (
          <SelectItem key={e.code} value={e.code} className="text-xs">
            {e.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
