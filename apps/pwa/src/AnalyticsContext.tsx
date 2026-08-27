import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { computeAnalytics, type Analytics } from "@inventory/core";
import { useAppStore } from "./store/appStore.js";

const AnalyticsCtx = createContext<Analytics | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const snapshot = useAppStore((s) => s.snapshot);
  const currentLocationId = useAppStore((s) => s.currentLocationId);
  const filters = useAppStore((s) => s.filters);

  const analytics = useMemo(() => {
    const location = snapshot?.locations.find((l) => l.id === currentLocationId);
    if (!location) return null;
    return computeAnalytics(location, filters);
  }, [snapshot, currentLocationId, filters]);

  return <AnalyticsCtx.Provider value={analytics}>{children}</AnalyticsCtx.Provider>;
}

export function useAnalytics(): Analytics | null {
  return useContext(AnalyticsCtx);
}
