"use client";

import { StatusDot } from "@/components/dashboard/status-dot";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

/**
 * Proxigrid top bar — friendly wordmark, a calm "live" indicator, the paper
 * (testnet) badge, and the light/dark toggle.
 */
export function Header() {
  return (
    <header className="flex-none border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Wordmark */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
              <span className="text-base font-bold text-primary-foreground">P</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight leading-none">
                <span className="text-brand-gradient">Proxi</span>
                <span className="text-foreground">grid</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Crypto markets &amp; automation
              </p>
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
              <StatusDot color="emerald" pulse size="sm" />
              <span className="text-xs font-medium text-foreground">Live</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-300">
                Binance testnet
              </span>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
