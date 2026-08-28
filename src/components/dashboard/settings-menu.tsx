"use client";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useLocalSetting } from "@/hooks/use-local-setting";
import { SETTINGS } from "@/lib/settings";
import { Settings } from "lucide-react";

/** Header settings popover — currently the opportunity-alert sensitivity. */
export function SettingsMenu() {
  const [threshold, setThreshold] = useLocalSetting(
    SETTINGS.oppThreshold.key,
    SETTINGS.oppThreshold.default
  );
  const pct = Math.round(threshold * 100);

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
          <p className="text-xs text-muted-foreground">Tune how the app alerts you.</p>
        </div>

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
