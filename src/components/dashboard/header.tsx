"use client";

import * as React from "react";
import { StatusDot } from "@/components/dashboard/status-dot";
import { cn } from "@/lib/utils";

/**
 * Premium terminal header for Proxigrid.
 *
 * Layout: [logo gradient + wordmark] ---- [LIVE pulse] [UTC clock] [testnet chip]
 * The clock ticks every second; the LIVE dot pulses on a 1.8s cycle.
 */
const TIME_PLACEHOLDER = "--:--:--";

function formatUtcTime() {
  return new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// useSyncExternalStore requires getSnapshot to return a *cached* value that
// only changes when the store does — returning a fresh string on every call
// trips React's "getSnapshot should be cached" infinite-loop guard. So we keep
// the formatted time in a module-level cache and refresh it once per tick.
let cachedTime = TIME_PLACEHOLDER;

function subscribeToSecond(onTick: () => void) {
  cachedTime = formatUtcTime(); // show the real time immediately on mount
  onTick();
  const id = setInterval(() => {
    cachedTime = formatUtcTime();
    onTick();
  }, 1000);
  return () => clearInterval(id);
}

function getTimeSnapshot() {
  return cachedTime;
}

export function Header() {
  // The clock is an external, ticking source — read it via a store so there
  // is no setState-in-effect. Server render (and hydration) uses the
  // placeholder, then reconciles to the live UTC time on the client.
  const time = React.useSyncExternalStore(
    subscribeToSecond,
    getTimeSnapshot,
    () => TIME_PLACEHOLDER,
  );

  return (
    <header className="flex-none border-b border-border/60 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Wordmark */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-9 w-9 rounded-xl overflow-hidden flex-shrink-0 shadow-glow-brand">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600" />
              <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-br from-emerald-400/20 to-teal-600/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-black tracking-tighter text-white drop-shadow">
                  P
                </span>
              </div>
              {/* top edge highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold tracking-tight leading-none">
                <span className="text-brand-gradient">Proxi</span>
                <span className="text-foreground">grid</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mt-1 truncate">
                Market Intelligence Terminal
              </p>
            </div>
          </div>

          {/* Status cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* LIVE indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/8 border border-emerald-500/20">
              <StatusDot color="emerald" pulse size="sm" label="live" />
              <span className="text-[11px] font-semibold tracking-wider text-emerald-300 uppercase">
                Live
              </span>
            </div>

            {/* UTC clock */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md border border-border/60 bg-card/40 font-mono text-[12px] tabular-nums text-muted-foreground">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                UTC
              </span>
              <span className="text-foreground/90 font-semibold">{time}</span>
            </div>

            {/* Binance testnet chip */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md",
                "bg-amber-500/8 border border-amber-500/25"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-semibold tracking-wider text-amber-300 uppercase">
                Binance
              </span>
              <span className="text-[10px] text-amber-200/70 font-medium">
                testnet
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
