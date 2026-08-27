"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Light/dark toggle. Renders a stable placeholder until mounted to avoid a
 * hydration mismatch (the resolved theme is only known on the client).
 */
const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Client-only flag without a setState-in-effect: server snapshot is false,
  // client snapshot is true, so the icon only resolves after hydration.
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Only trust the resolved theme after mount, so the server render and the
  // first client render agree (both assume "not dark") — no hydration mismatch.
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px]" />
      ) : (
        <Moon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
