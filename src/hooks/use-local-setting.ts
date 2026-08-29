"use client";

import * as React from "react";

// Same-tab subscribers — localStorage's `storage` event only fires in *other*
// tabs, so we also broadcast writes locally to keep components in sync.
const listeners = new Set<() => void>();
function emitLocal() {
  for (const l of listeners) l();
}

/**
 * A numeric user setting persisted in localStorage, SSR-safe via
 * useSyncExternalStore (server + first client render return the fallback, so
 * there's no hydration mismatch). Updates sync across components in the same
 * tab and across other tabs (storage event).
 */
export function useLocalSetting(
  key: string,
  fallback: number
): [number, (v: number) => void] {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key]
  );

  const getSnapshot = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);

  const value = React.useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const set = React.useCallback(
    (v: number) => {
      try {
        localStorage.setItem(key, String(v));
      } catch {
        // ignore (private mode / disabled storage) — value stays in-memory only
      }
      emitLocal();
    },
    [key]
  );

  return [value, set];
}

/** String-valued sibling of useLocalSetting (same cross-component sync). */
export function useLocalStringSetting(
  key: string,
  fallback: string
): [string, (v: string) => void] {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key]
  );

  const getSnapshot = React.useCallback(() => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);

  const value = React.useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const set = React.useCallback(
    (v: string) => {
      try {
        localStorage.setItem(key, v);
      } catch {
        /* ignore */
      }
      emitLocal();
    },
    [key]
  );

  return [value, set];
}
