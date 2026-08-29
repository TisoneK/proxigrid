"use client";

import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useLocalSetting } from "@/hooks/use-local-setting";
import { SETTINGS } from "@/lib/settings";
import { useTheme } from "next-themes";
import { Settings, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
] as const;

const emptySubscribe = () => () => {};

/** Header settings popover — appearance (theme) + opportunity-alert sensitivity. */
export function SettingsMenu() {
  const [threshold, setThreshold] = useLocalSetting(
    SETTINGS.oppThreshold.key,
    SETTINGS.oppThreshold.default
  );
  const pct = Math.round(threshold * 100);

  const { theme, setTheme } = useTheme();
  // Client-only flag (no setState-in-effect): the theme choice is only known on
  // the client, so don't highlight an option until after hydration.
  const mounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);
  const activeTheme = mounted ? theme ?? "system" : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Settings"
          className="grid place-items-center size-9 rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
        >
          <Settings className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Settings</h3>
          <p className="text-xs text-muted-foreground">Appearance and alerts.</p>
        </div>

        {/* Appearance */}
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-foreground">Appearance</label>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-secondary">
            {THEMES.map((t) => {
              const Icon = t.icon;
              const active = activeTheme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Opportunity alerts */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Opportunity alert sensitivity</label>
            <span className="text-xs font-semibold tabular-nums text-foreground">≥ {pct}%</span>
          </div>
          <Slider
            value={[pct]}
            min={10}
            max={95}
            step={5}
            onValueChange={([v]) => setThreshold(v / 100)}
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Only signals at or above this confidence raise a &ldquo;Place order&rdquo; toast.
            Lower it to catch more, raise it for only the strongest setups.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
