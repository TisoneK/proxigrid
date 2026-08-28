"use client";

import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { NotificationBell } from "@/components/dashboard/notification-bell";

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
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-none">
              <span className="text-brand-gradient">Proxi</span>
              <span className="text-foreground">grid</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Crypto markets &amp; automation
            </p>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-secondary border border-border">
              <img src="/coins/bnb.svg" alt="Binance" width={18} height={18} />
              <span className="text-xs font-medium text-foreground">Binance</span>
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">testnet</span>
            </div>

            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
