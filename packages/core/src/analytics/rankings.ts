import {
  RESTOCK_COVER_DAYS,
  type ProductAnalytics,
  type Rankings,
  type RestockSuggestion,
} from "../types.js";

export function computeRankings(products: ProductAnalytics[]): Rankings {
  const mostSold = [...products].sort((a, b) => b.unitsSold - a.unitsSold);

  const leastSold = [...products].sort((a, b) => {
    if (a.unitsSold !== b.unitsSold) return a.unitsSold - b.unitsSold;
    return (a.profitPerDay ?? 0) - (b.profitPerDay ?? 0);
  });

  const juiciest = [...products]
    .filter((p) => p.profitPerDay != null)
    .sort((a, b) => (b.profitPerDay ?? 0) - (a.profitPerDay ?? 0));

  const topProfit = [...products]
    .filter((p) => p.profit != null)
    .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0));

  return { mostSold, leastSold, juiciest, topProfit };
}

export function computeRestock(products: ProductAnalytics[]): RestockSuggestion[] {
  return products
    .filter(
      (p) => p.unitsSold > 0 && p.daysOfCover != null && p.daysOfCover < RESTOCK_COVER_DAYS,
    )
    .sort((a, b) => (b.profitPerDay ?? 0) - (a.profitPerDay ?? 0))
    .map((p) => ({
      product: p,
      reason:
        p.stockRemaining <= 0
          ? "Agotado"
          : `Cobertura ~${Math.round(p.daysOfCover ?? 0)} días`,
    }));
}
