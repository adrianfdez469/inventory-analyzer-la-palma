export type Currency = "USD" | "CUP";

/** Fila de la hoja "Inversion": una compra de producto */
export interface Purchase {
  product: string;
  quantity: number;
  purchasePriceCUP: number | null;
  purchasePriceUSD: number | null;
  totalSpentCUP: number | null;
  totalSpentUSD: number | null;
  salePriceCUP: number | null;
  salePriceUSD: number | null;
  unitProfitUSD: number | null;
  unitProfitCUP: number | null;
  totalProfitUSD: number | null;
  totalProfitCUP: number | null;
  date: string | null;
  exchangeRate: number | null;
  supplier: string | null;
}

/** Fila de producto dentro de un corte (hoja Productos USD/CUP) */
export interface CorteLine {
  product: string;
  initialStock: number;
  soldQty: number;
  remaining: number;
  purchasePrice: number | null;
  salePrice: number | null;
  unitProfit: number | null;
  revenue: number | null;
  adrianInvestPlusProfit: number | null;
  profitAlejandro: number | null;
  storeShare: number | null;
  adrianInvestment: number | null;
  profitAdrian: number | null;
}

/** Bloque "Corte N" con su rango de fechas y las líneas de producto */
export interface Corte {
  /** Secuencial único dentro de su local (1, 2, 3...), asignado tras ordenar por fecha.
   *  Es el identificador real para filtros/keys — algunos locales (ej. Leo) reinician su
   *  propia numeración a mitad de la hoja, así que `index` puede repetirse. */
  id: number;
  /** Número de corte tal cual aparece en la hoja (puede repetirse entre locales o incluso
   *  dentro del mismo local si el negocio reinició su numeración). Solo para mostrar. */
  index: number;
  title: string;
  exchangeRate: number | null;
  startDate: string;
  endDate: string;
  days: number;
  lines: CorteLine[];
}

/** Fila de la hoja "Ganancias Adrian y Ale" (montos en CUP) */
export interface ResumenRow {
  corte: string;
  totalSales: number | null;
  moneyReceived: number | null;
  investment: number | null;
  profitAlejandro: number | null;
  profitAdrian: number | null;
  profitPct: number | null;
}

/** Datos de un local/negocio (ej. Palma, Leo, Vedado) dentro del Excel */
export interface LocationSnapshot {
  /** Nombre del local normalizado (minúsculas, sin acentos) — estable, usado como key */
  id: string;
  /** Nombre del local para mostrar (ej. "Palma", "Leo", "Vedado") */
  label: string;
  sourceCurrency: Currency;
  cortes: Corte[];
  purchases: Purchase[];
  resumen: ResumenRow[];
  /** Avisos de parseo específicos de este local (continuidad de stock, hojas faltantes, etc.) */
  warnings: string[];
}

/** Resultado completo de importar el Excel */
export interface InventorySnapshot {
  version: 2;
  fileName: string;
  importedAt: string;
  locations: LocationSnapshot[];
  /** Avisos globales, no asociados a un local específico */
  warnings: string[];
}

export class InventoryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryParseError";
  }
}

/* ============================ Analítica ============================ */

export interface AnalyticsFilters {
  /** Fecha inicio (ISO yyyy-mm-dd), inclusiva */
  from?: string;
  /** Fecha fin (ISO yyyy-mm-dd), inclusiva */
  to?: string;
  /** Ids de corte (Corte.id, no el número de la hoja) seleccionados (undefined = todos) */
  cortes?: number[];
}

export interface PurchasePriceInfo {
  last: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
  history: Purchase[];
}

export type Quadrant =
  | "star"
  | "volume"
  | "niche"
  | "phase-out"
  | "no-sales";

export interface CorteProductRecord {
  /** Corte.id del corte al que corresponde esta línea */
  corteId: number;
  /** Corte.index — el número tal cual aparece en el Excel, para mostrar en UI */
  corteIndex: number;
  startDate: string;
  endDate: string;
  initialStock: number;
  soldQty: number;
  remaining: number;
  revenue: number | null;
  profit: number | null;
}

export interface ProductAnalytics {
  product: string;
  unitsSold: number;
  cortesWithSales: number;
  shelfDays: number;
  unitsPerDay: number | null;
  revenue: number | null;
  profit: number | null;
  /** Ganancia USD por día: el "score de jugosidad" */
  profitPerDay: number | null;
  marginPct: number | null;
  sellThroughPct: number | null;
  stockRemaining: number;
  stockValueAtCost: number | null;
  lastPurchasePrice: number | null;
  lastSalePrice: number | null;
  firstListedDate: string;
  lastSaleDate: string | null;
  daysOnShelf: number;
  daysSinceLastSale: number | null;
  neverSold: boolean;
  daysOfCover: number | null;
  purchasePrice: PurchasePriceInfo;
  juicinessScore: number | null;
  quadrant: Quadrant;
  perCorte: CorteProductRecord[];
}

export interface CorteAggregate {
  /** Corte.id del corte (único dentro del local) */
  id: number;
  /** Corte.index — el número tal cual aparece en el Excel, para mostrar en UI */
  index: number;
  startDate: string;
  endDate: string;
  days: number;
  unitsSold: number;
  revenue: number;
  profit: number;
}

export interface Totals {
  cortes: number;
  days: number;
  unitsSold: number;
  revenue: number;
  profit: number;
  profitPerDay: number;
  stockUnits: number;
  stockValueAtCost: number;
  investmentInRange: number;
  productsTracked: number;
  rangeStart: string | null;
  rangeEnd: string | null;
}

export interface RestockSuggestion {
  product: ProductAnalytics;
  reason: string;
}

export interface Rankings {
  mostSold: ProductAnalytics[];
  leastSold: ProductAnalytics[];
  juiciest: ProductAnalytics[];
  topProfit: ProductAnalytics[];
}

export interface Analytics {
  filters: AnalyticsFilters;
  cortes: Corte[];
  corteAggregates: CorteAggregate[];
  products: ProductAnalytics[];
  totals: Totals;
  /** Tasa de cambio usada para mostrar montos en CUP (si existe) */
  displayRate: number | null;
  /** Medianas usadas para los cuadrantes */
  medians: { unitsPerDay: number; marginPct: number };
  rankings: Rankings;
  restock: RestockSuggestion[];
  warnings: string[];
}

/** Umbral de días de cobertura bajo el cual se sugiere reponer */
export const RESTOCK_COVER_DAYS = 21;
