"use client";

import { NotificationBell } from "@/components/dashboard/notification-bell";
import { SettingsMenu } from "@/components/dashboard/settings-menu";
import { Search } from "lucide-react";

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
            {/* Desktop: labelled search pill. Mobile: compact icon button so the
                command palette is still reachable without a keyboard. */}
            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent("proxigrid:command"))}
              className="hidden sm:flex items-center gap-2 h-9 w-56 lg:w-72 rounded-full border border-border bg-card pl-3.5 pr-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary hover:border-border/80"
              aria-label="Search markets"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span>Search markets…</span>
              <kbd className="ml-auto rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent("proxigrid:command"))}
              className="sm:hidden grid place-items-center size-9 rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            <div className="hidden md:flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-secondary border border-border">
              <img src="/coins/bnb.svg" alt="Binance" width={18} height={18} />
              <span className="text-xs font-medium text-foreground">Binance</span>
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">testnet</span>
            </div>

            <NotificationBell />
            <SettingsMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
