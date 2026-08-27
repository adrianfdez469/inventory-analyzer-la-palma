import { create } from "zustand";
import type { AnalyticsFilters, Currency, InventorySnapshot } from "@inventory/core";

export type Page = "import" | "dashboard" | "ranking" | "products" | "restock";

function defaultLocationId(snapshot: InventorySnapshot | null): string | null {
  return snapshot?.locations[0]?.id ?? null;
}

interface AppState {
  snapshot: InventorySnapshot | null;
  currentLocationId: string | null;
  filters: AnalyticsFilters;
  currency: Currency;
  page: Page;
  detailProduct: string | null;
  setSnapshot: (snapshot: InventorySnapshot | null) => void;
  setCurrentLocationId: (locationId: string | null) => void;
  setFilters: (filters: AnalyticsFilters) => void;
  setCurrency: (currency: Currency) => void;
  setPage: (page: Page) => void;
  setDetailProduct: (product: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  snapshot: null,
  currentLocationId: null,
  filters: {},
  currency: "USD",
  page: "import",
  detailProduct: null,
  setSnapshot: (snapshot) =>
    set({
      snapshot,
      currentLocationId: defaultLocationId(snapshot),
      filters: {},
      detailProduct: null,
    }),
  // Los ids de corte filtrados y el producto seleccionado son específicos de cada local.
  setCurrentLocationId: (currentLocationId) =>
    set({ currentLocationId, filters: {}, detailProduct: null }),
  setFilters: (filters) => set({ filters }),
  setCurrency: (currency) => set({ currency }),
  setPage: (page) => set({ page }),
  setDetailProduct: (detailProduct) => set({ detailProduct }),
}));
