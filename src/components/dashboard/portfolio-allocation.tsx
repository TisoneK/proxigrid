"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatUsd } from "@/lib/utils/format";

interface Holding {
  asset: string;
  valueInQuote: number;
}

// Distinct literal colors (recharts SVG fills don't resolve CSS vars).
const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#94a3b8"];

/**
 * Donut of holdings by value. Aggregates across exchanges, keeps the top slices
 * and groups the tail into "Other". Renders nothing when there's no value.
 */
export function PortfolioAllocation({ holdings }: { holdings: Holding[] }) {
  const slices = React.useMemo(() => {
    const byAsset = new Map<string, number>();
    for (const h of holdings) {
      if (h.valueInQuote <= 0) continue;
      byAsset.set(h.asset, (byAsset.get(h.asset) ?? 0) + h.valueInQuote);
    }
    const sorted = [...byAsset.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, PALETTE.length - 1);
    const rest = sorted.slice(PALETTE.length - 1);
    const out = top.map(([asset, value]) => ({ asset, value }));
    const restTotal = rest.reduce((s, [, v]) => s + v, 0);
    if (restTotal > 0) out.push({ asset: "Other", value: restTotal });
    return out;
  }, [holdings]);

  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;

  return (
    <section className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Allocation</div>
      <div className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="asset"
                innerRadius="58%"
                outerRadius="100%"
                paddingAngle={1.5}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((s, i) => (
                  <Cell key={s.asset} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<AllocTip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-1.5 min-w-0">
          {slices.map((s, i) => (
            <li key={s.asset} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="font-medium w-14 truncate">{s.asset}</span>
              <span className="flex-1 text-right text-muted-foreground tabular-nums">
                {formatUsd(s.value)}
              </span>
              <span className="w-10 text-right tabular-nums font-semibold">
                {((s.value / total) * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AllocTip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-semibold">{p.name}</div>
      <div className="text-muted-foreground tabular-nums">
        {formatUsd(p.value)} · {((p.value / total) * 100).toFixed(1)}%
      </div>
    </div>
  );
}
