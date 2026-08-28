/**
 * Client-side user settings (localStorage-backed). Keep keys + defaults here so
 * the reader (e.g. OpportunityWatcher) and the control (SettingsMenu) agree.
 */
export const SETTINGS = {
  /** OpportunityWatcher: minimum signal strength (0–1) before it raises a toast. */
  oppThreshold: { key: "proxigrid:opp-threshold", default: 0.5 },
} as const;
