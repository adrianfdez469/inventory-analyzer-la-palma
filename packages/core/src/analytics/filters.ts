import type { AnalyticsFilters, Corte } from "../types.js";

export function filterCortes(cortes: Corte[], filters: AnalyticsFilters): Corte[] {
  let result = cortes;

  if (filters.cortes && filters.cortes.length > 0) {
    const set = new Set(filters.cortes);
    result = result.filter((c) => set.has(c.index));
  }

  if (filters.from || filters.to) {
    const from = filters.from ?? "0000-01-01";
    const to = filters.to ?? "9999-12-31";
    result = result.filter((c) => c.startDate <= to && c.endDate >= from);
  }

  return result;
}
