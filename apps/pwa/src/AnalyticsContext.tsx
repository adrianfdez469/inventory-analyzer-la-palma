import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { computeAnalytics, type Analytics } from "@inventory/core";
import { useAppStore } from "./store/appStore.js";

const AnalyticsCtx = createContext<Analytics | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const snapshot = useAppStore((s) => s.snapshot);
  const filters = useAppStore((s) => s.filters);

  const analytics = useMemo(() => {
    if (!snapshot) return null;
    return computeAnalytics(snapshot, filters);
  }, [snapshot, filters]);

  return <AnalyticsCtx.Provider value={analytics}>{children}</AnalyticsCtx.Provider>;
}

export function useAnalytics(): Analytics | null {
  return useContext(AnalyticsCtx);
}
