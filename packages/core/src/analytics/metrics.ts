import type {
  Analytics,
  AnalyticsFilters,
  Corte,
  CorteAggregate,
  CorteLine,
  CorteProductRecord,
  LocationSnapshot,
  ProductAnalytics,
  Purchase,
  PurchasePriceInfo,
  Quadrant,
  Totals,
} from "../types.js";
import { diffDays } from "../parser/utils.js";
import { filterCortes } from "./filters.js";
import { computeRankings, computeRestock } from "./rankings.js";

function lineProfit(line: CorteLine): number | null {
  if (line.unitProfit != null) return line.unitProfit * line.soldQty;
  if (line.purchasePrice != null && line.salePrice != null) {
    return (line.salePrice - line.purchasePrice) * line.soldQty;
  }
  if (
    line.profitAdrian != null ||
    line.profitAlejandro != null ||
    line.storeShare != null
  ) {
    return (line.profitAdrian ?? 0) + (line.profitAlejandro ?? 0) + (line.storeShare ?? 0);
  }
  return null;
}

function lineRevenue(line: CorteLine): number {
  if (line.revenue != null) return line.revenue;
  if (line.salePrice != null) return line.salePrice * line.soldQty;
  return 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

interface ProductLineRef {
  corte: Corte;
  line: CorteLine;
}

function buildPurchasePriceInfo(
  product: string,
  purchases: Purchase[],
  range: { start: string | null; end: string | null } | null,
): PurchasePriceInfo {
  let history = purchases.filter((p) => p.product === product);
  if (range) {
    history = history.filter(
      (p) =>
        p.date != null &&
        (range.start == null || p.date >= range.start) &&
        (range.end == null || p.date <= range.end),
    );
  }
  history = [...history].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  const prices = history
    .map((p) => p.purchasePriceUSD)
    .filter((v): v is number => v != null);

  if (prices.length === 0) {
    return { last: null, avg: null, min: null, max: null, history };
  }

  return {
    last: history[history.length - 1]?.purchasePriceUSD ?? prices[prices.length - 1],
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    history,
  };
}

export function computeAnalytics(
  location: LocationSnapshot,
  filters: AnalyticsFilters = {},
): Analytics {
  const warnings: string[] = [];
  const filtered = filterCortes(location.cortes, filters);

  if (filtered.length === 0) {
    warnings.push("Ningún corte cumple el filtro seleccionado.");
  }

  const rangeStart =
    filtered.length > 0
      ? filtered.reduce((min, c) => (c.startDate < min ? c.startDate : min), filtered[0].startDate)
      : (filters.from ?? null);
  const rangeEnd =
    filtered.length > 0
      ? filtered.reduce((max, c) => (c.endDate > max ? c.endDate : max), filtered[0].endDate)
      : (filters.to ?? null);

  const hasFilters = Boolean(
    filters.from || filters.to || (filters.cortes && filters.cortes.length > 0),
  );

  // Agrupar líneas por producto a través de los cortes filtrados (orden ya ascendente)
  const byProduct = new Map<string, ProductLineRef[]>();
  for (const corte of filtered) {
    for (const line of corte.lines) {
      const list = byProduct.get(line.product) ?? [];
      list.push({ corte, line });
      byProduct.set(line.product, list);
    }
  }

  const products: ProductAnalytics[] = [];

  for (const [product, refs] of byProduct) {
    const unitsSold = refs.reduce((sum, r) => sum + r.line.soldQty, 0);
    const cortesWithSales = refs.filter((r) => r.line.soldQty > 0).length;
    const shelfDays = refs.reduce((sum, r) => sum + r.corte.days, 0);
    const unitsPerDay = shelfDays > 0 ? unitsSold / shelfDays : null;

    const revenue = refs.reduce((sum, r) => sum + lineRevenue(r.line), 0);
    const profits = refs.map((r) => lineProfit(r.line));
    const profit = profits.some((p) => p != null)
      ? profits.reduce((sum: number, p) => sum + (p ?? 0), 0)
      : null;
    const profitPerDay = profit != null && shelfDays > 0 ? profit / shelfDays : null;

    const first = refs[0];
    const last = refs[refs.length - 1];

    const lastPurchasePrice = last.line.purchasePrice;
    const lastSalePrice = last.line.salePrice;
    const marginPct =
      lastPurchasePrice != null && lastPurchasePrice !== 0 && lastSalePrice != null
        ? ((lastSalePrice - lastPurchasePrice) / lastPurchasePrice) * 100
        : null;

    const stockRemaining = last.line.remaining;
    const stockValueAtCost =
      lastPurchasePrice != null ? stockRemaining * lastPurchasePrice : null;

    const sellThroughPct =
      unitsSold + stockRemaining > 0
        ? (unitsSold / (unitsSold + stockRemaining)) * 100
        : null;

    const lastSaleRef = [...refs].reverse().find((r) => r.line.soldQty > 0);
    const lastSaleDate = lastSaleRef ? lastSaleRef.corte.endDate : null;
    const neverSold = lastSaleDate == null;
    const daysSinceLastSale =
      rangeEnd != null && lastSaleDate != null ? diffDays(lastSaleDate, rangeEnd) : null;

    const firstListedDate = first.corte.startDate;
    const daysOnShelf = rangeEnd != null ? diffDays(firstListedDate, rangeEnd) : 0;

    const daysOfCover =
      unitsPerDay != null && unitsPerDay > 0 ? stockRemaining / unitsPerDay : null;

    const purchasePrice = buildPurchasePriceInfo(
      product,
      location.purchases,
      hasFilters ? { start: rangeStart, end: rangeEnd } : null,
    );

    const perCorte: CorteProductRecord[] = refs.map((r) => ({
      corteId: r.corte.id,
      startDate: r.corte.startDate,
      endDate: r.corte.endDate,
      initialStock: r.line.initialStock,
      soldQty: r.line.soldQty,
      remaining: r.line.remaining,
      revenue: lineRevenue(r.line),
      profit: lineProfit(r.line),
    }));

    products.push({
      product,
      unitsSold,
      cortesWithSales,
      shelfDays,
      unitsPerDay,
      revenue,
      profit,
      profitPerDay,
      marginPct,
      sellThroughPct,
      stockRemaining,
      stockValueAtCost,
      lastPurchasePrice,
      lastSalePrice,
      firstListedDate,
      lastSaleDate,
      daysOnShelf,
      daysSinceLastSale,
      neverSold,
      daysOfCover,
      purchasePrice,
      juicinessScore: null, // se completa abajo
      quadrant: "no-sales",
      perCorte,
    });
  }

  // Score de jugosidad relativo al máximo profitPerDay
  const maxProfitPerDay = products.reduce(
    (max, p) => (p.profitPerDay != null && p.profitPerDay > max ? p.profitPerDay : max),
    0,
  );
  for (const p of products) {
    p.juicinessScore =
      p.profitPerDay != null && maxProfitPerDay > 0
        ? (p.profitPerDay / maxProfitPerDay) * 100
        : null;
  }

  // Cuadrantes según medianas de productos con venta
  const withSales = products.filter((p) => p.unitsSold > 0);
  const medianUnitsPerDay = median(withSales.map((p) => p.unitsPerDay ?? 0));
  const medianMarginPct = median(withSales.map((p) => p.marginPct ?? 0));

  for (const p of products) {
    let quadrant: Quadrant;
    if (p.unitsSold === 0) {
      quadrant = "no-sales";
    } else {
      const fast = (p.unitsPerDay ?? 0) >= medianUnitsPerDay;
      const highMargin = (p.marginPct ?? 0) >= medianMarginPct;
      if (fast && highMargin) quadrant = "star";
      else if (fast && !highMargin) quadrant = "volume";
      else if (!fast && highMargin) quadrant = "niche";
      else quadrant = "phase-out";
    }
    p.quadrant = quadrant;
  }

  const corteAggregates: CorteAggregate[] = filtered.map((corte) => ({
    id: corte.id,
    startDate: corte.startDate,
    endDate: corte.endDate,
    days: corte.days,
    unitsSold: corte.lines.reduce((sum, l) => sum + l.soldQty, 0),
    revenue: corte.lines.reduce((sum, l) => sum + lineRevenue(l), 0),
    profit: corte.lines.reduce((sum, l) => sum + (lineProfit(l) ?? 0), 0),
  }));

  const totalDays = corteAggregates.reduce((sum, c) => sum + c.days, 0);
  const totalUnitsSold = corteAggregates.reduce((sum, c) => sum + c.unitsSold, 0);
  const totalRevenue = corteAggregates.reduce((sum, c) => sum + c.revenue, 0);
  const totalProfit = corteAggregates.reduce((sum, c) => sum + c.profit, 0);
  const totalStockUnits = products.reduce((sum, p) => sum + p.stockRemaining, 0);
  const totalStockValueAtCost = products.reduce(
    (sum, p) => sum + (p.stockValueAtCost ?? 0),
    0,
  );

  const purchasesInRange = location.purchases.filter(
    (p) =>
      p.date != null &&
      (rangeStart == null || p.date >= rangeStart) &&
      (rangeEnd == null || p.date <= rangeEnd),
  );
  const investmentInRange = (hasFilters ? purchasesInRange : location.purchases).reduce(
    (sum, p) => sum + (p.totalSpentUSD ?? 0),
    0,
  );

  const totals: Totals = {
    cortes: filtered.length,
    days: totalDays,
    unitsSold: totalUnitsSold,
    revenue: totalRevenue,
    profit: totalProfit,
    profitPerDay: totalDays > 0 ? totalProfit / totalDays : 0,
    stockUnits: totalStockUnits,
    stockValueAtCost: totalStockValueAtCost,
    investmentInRange,
    productsTracked: products.length,
    rangeStart,
    rangeEnd,
  };

  const rateSource = filtered.length > 0 ? filtered : location.cortes;
  const lastRate = rateSource[rateSource.length - 1]?.exchangeRate ?? null;
  const definedRates = rateSource
    .map((c) => c.exchangeRate)
    .filter((r): r is number => r != null);
  const displayRate =
    lastRate ?? (definedRates.length > 0
      ? definedRates.reduce((a, b) => a + b, 0) / definedRates.length
      : null);

  return {
    filters,
    cortes: filtered,
    corteAggregates,
    products,
    totals,
    displayRate,
    medians: { unitsPerDay: medianUnitsPerDay, marginPct: medianMarginPct },
    rankings: computeRankings(products),
    restock: computeRestock(products),
    warnings,
  };
}
