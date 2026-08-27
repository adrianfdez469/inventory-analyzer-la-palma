import { create } from "zustand";
import type { AnalyticsFilters, Currency, InventorySnapshot } from "@inventory/core";

export type Page = "import" | "dashboard" | "ranking" | "products" | "restock";

interface AppState {
  snapshot: InventorySnapshot | null;
  filters: AnalyticsFilters;
  currency: Currency;
  page: Page;
  detailProduct: string | null;
  setSnapshot: (snapshot: InventorySnapshot | null) => void;
  setFilters: (filters: AnalyticsFilters) => void;
  setCurrency: (currency: Currency) => void;
  setPage: (page: Page) => void;
  setDetailProduct: (product: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  snapshot: null,
  filters: {},
  currency: "USD",
  page: "import",
  detailProduct: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  setFilters: (filters) => set({ filters }),
  setCurrency: (currency) => set({ currency }),
  setPage: (page) => set({ page }),
  setDetailProduct: (detailProduct) => set({ detailProduct }),
}));
