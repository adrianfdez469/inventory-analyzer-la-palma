import type * as XLSX from "xlsx";
import { utils } from "xlsx";
import type { Purchase } from "../types.js";
import { norm, toISODate, toNum } from "./utils.js";

interface ColumnMap {
  product: number;
  quantity: number;
  purchasePriceCUP: number;
  purchasePriceUSD: number;
  totalSpentCUP: number;
  totalSpentUSD: number;
  salePriceCUP: number;
  salePriceUSD: number;
  unitProfitCUP: number;
  unitProfitUSD: number;
  totalProfitCUP: number;
  totalProfitUSD: number;
  date: number;
  exchangeRate: number;
  supplier: number;
}

function cell(row: unknown[] | undefined, idx: number | undefined): unknown {
  if (row == null || idx == null || idx < 0) return null;
  return row[idx] ?? null;
}

function mapColumns(headerRow: unknown[]): ColumnMap {
  const normalized = headerRow.map((h) => norm(h));
  const map: Partial<Record<keyof ColumnMap, number>> = {};

  const find = (pred: (h: string) => boolean, exclude?: (h: string) => boolean) => {
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      if (!h) continue;
      if (exclude?.(h)) continue;
      if (pred(h)) return i;
    }
    return -1;
  };

  map.product = find((h) => h === "productos" || h.includes("productos"));
  map.quantity = find((h) => h === "cantidad" || h.includes("cantidad"));

  map.purchasePriceCUP = find(
    (h) => h.includes("precio de compra") && h.includes("unitario") && h.includes("cup"),
  );
  map.purchasePriceUSD = find(
    (h) => h.includes("precio de compra") && h.includes("usd"),
  );
  map.totalSpentCUP = find((h) => h.includes("gasto total") && h.includes("cup"));
  map.totalSpentUSD = find((h) => h.includes("gasto total") && h.includes("usd"));
  map.salePriceCUP = find(
    (h) => h.includes("precio de venta") && h.includes("unitario") && h.includes("cup"),
  );
  map.salePriceUSD = find((h) => h.includes("precio de venta") && h.includes("usd"));
  map.unitProfitCUP = find(
    (h) => h.includes("ganancia unitaria") && h.includes("cup"),
  );
  map.unitProfitUSD = find(
    (h) => h.includes("ganancia unitaria") && h.includes("usd"),
  );
  map.totalProfitCUP = find(
    (h) => h.includes("ganancia total") && h.includes("cup"),
  );
  map.totalProfitUSD = find(
    (h) => h.includes("ganancia total") && h.includes("usd"),
  );
  map.date = find((h) => h.includes("fecha"));
  map.exchangeRate = find((h) => h.includes("cambio") && h.includes("dolar"));
  map.supplier = -1;
  if (map.exchangeRate !== -1 && map.exchangeRate !== undefined) {
    const after = map.exchangeRate + 1;
    if (after < headerRow.length) map.supplier = after;
  }
  if (map.supplier === -1) {
    map.supplier = normalized.findIndex((h, i) => !h && headerRow[i] === undefined);
  }

  return map as ColumnMap;
}

export function parseInversionSheet(
  ws: XLSX.WorkSheet,
): { purchases: Purchase[]; warnings: string[] } {
  const rows: unknown[][] = utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });
  const warnings: string[] = [];
  const purchases: Purchase[] = [];

  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (row && norm(row[0]) === "productos") {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    warnings.push('Inversion: no se encontró fila de encabezado ("Productos" en columna A)');
    return { purchases, warnings };
  }

  const cols = mapColumns(rows[headerRowIdx]);

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const productRaw = cell(row, cols.product);
    if (norm(productRaw) === "total") break;
    if (!productRaw || norm(productRaw) === "") continue;

    purchases.push({
      product: String(productRaw).trim(),
      quantity: toNum(cell(row, cols.quantity)) ?? 0,
      purchasePriceCUP: toNum(cell(row, cols.purchasePriceCUP)),
      purchasePriceUSD: toNum(cell(row, cols.purchasePriceUSD)),
      totalSpentCUP: toNum(cell(row, cols.totalSpentCUP)),
      totalSpentUSD: toNum(cell(row, cols.totalSpentUSD)),
      salePriceCUP: toNum(cell(row, cols.salePriceCUP)),
      salePriceUSD: toNum(cell(row, cols.salePriceUSD)),
      unitProfitUSD: toNum(cell(row, cols.unitProfitUSD)),
      unitProfitCUP: toNum(cell(row, cols.unitProfitCUP)),
      totalProfitUSD: toNum(cell(row, cols.totalProfitUSD)),
      totalProfitCUP: toNum(cell(row, cols.totalProfitCUP)),
      date: toISODate(cell(row, cols.date)),
      exchangeRate: toNum(cell(row, cols.exchangeRate)),
      supplier: (() => {
        const v = cell(row, cols.supplier);
        return v == null || String(v).trim() === "" ? null : String(v).trim();
      })(),
    });
  }

  return { purchases, warnings };
}
