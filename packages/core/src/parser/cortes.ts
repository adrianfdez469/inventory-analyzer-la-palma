import type * as XLSX from "xlsx";
import { utils } from "xlsx";
import type { Corte, CorteLine } from "../types.js";
import {
  diffDays,
  findCorteTitleInRow,
  norm,
  parseCorteTitle,
  toNum,
} from "./utils.js";

interface ColumnMap {
  product: number;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  unitProfit: number;
  soldQty: number;
  remaining: number;
  remainingAlt: number;
  revenue: number;
  adrianInvProfit: number;
  profitAlejandro: number;
  storeShare: number;
  adrianInvestment: number;
  profitAdrian: number;
}

const ALIASES: Record<keyof ColumnMap, string[]> = {
  product: ["productos"],
  quantity: ["cantidad"],
  purchasePrice: ["precio de compra"],
  salePrice: ["precio de venta"],
  unitProfit: ["ganancia"],
  soldQty: ["cantidad vendida"],
  remaining: ["restante"],
  remainingAlt: ["porductos restantes", "productos restantes"],
  revenue: ["dinero total vendido"],
  // "dinero ale" cubre el formato de un solo dueño anterior a la sociedad con Adrian
  // (ej. "Dinero Ale 50%"), donde el mismo rol de inversor se llamaba "Ale".
  adrianInvProfit: ["dinero adrian inv", "dinero ale"],
  profitAlejandro: ["ganancia alejandro"],
  storeShare: ["dinero tienda"],
  adrianInvestment: ["inversion adrian", "inversion ale"],
  profitAdrian: ["ganancia adrian", "ganancia ale"],
};

function mapColumns(headerRow: unknown[]): ColumnMap {
  const normalized = headerRow.map((cell) => norm(cell));
  const map: Partial<Record<keyof ColumnMap, number>> = {};

  const keys = Object.keys(ALIASES) as (keyof ColumnMap)[];

  // Primera pasada: match exacto
  for (const key of keys) {
    if (map[key] !== undefined) continue;
    for (const alias of ALIASES[key]) {
      const idx = normalized.findIndex((h) => h === alias);
      if (idx !== -1) {
        map[key] = idx;
        break;
      }
    }
  }

  // Segunda pasada: startsWith
  for (const key of keys) {
    if (map[key] !== undefined) continue;
    for (const alias of ALIASES[key]) {
      const idx = normalized.findIndex((h) => h.startsWith(alias));
      if (idx !== -1) {
        map[key] = idx;
        break;
      }
    }
  }

  return map as ColumnMap;
}

function cell(row: unknown[] | undefined, idx: number | undefined): unknown {
  if (row == null || idx == null || idx < 0) return null;
  return row[idx] ?? null;
}

interface CorteDraft {
  index: number;
  title: string;
  exchangeRate: number | null;
  startDate: string;
  endDate: string | null;
  lines: CorteLine[];
}

export function parseCortesSheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
): { cortes: Corte[]; warnings: string[] } {
  const rows: unknown[][] = utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });
  const warnings: string[] = [];
  const drafts: CorteDraft[] = [];

  for (let r = 0; r < rows.length; r++) {
    const info = findCorteTitleInRow(rows[r]);
    if (!info) continue;

    // Buscar header ('productos' en col B, index 1) en las próximas 6 filas
    let headerRowIdx = -1;
    for (let h = r + 1; h <= Math.min(r + 6, rows.length - 1); h++) {
      const row = rows[h];
      if (row && norm(row[1]) === "productos") {
        headerRowIdx = h;
        break;
      }
    }
    if (headerRowIdx === -1) {
      warnings.push(
        `${sheetName}: no se encontró header de productos para "${rows[r]?.[1] ?? ""}" (fila ${r + 1})`,
      );
      continue;
    }

    const headerRow = rows[headerRowIdx];
    const cols = mapColumns(headerRow);

    const lines: CorteLine[] = [];
    let p = headerRowIdx + 1;
    for (; p < rows.length; p++) {
      const row = rows[p];
      if (!row) continue;
      if (findCorteTitleInRow(row)) break;

      const productRaw = cell(row, cols.product);
      const productNorm = norm(productRaw);
      if (productNorm === "total") {
        p++;
        break;
      }
      if (!productRaw || productNorm === "") continue;

      const initialStock = toNum(cell(row, cols.quantity)) ?? 0;
      const soldQty = toNum(cell(row, cols.soldQty)) ?? 0;
      const remaining =
        toNum(cell(row, cols.remaining)) ??
        toNum(cell(row, cols.remainingAlt)) ??
        initialStock;

      lines.push({
        product: String(productRaw).trim(),
        initialStock,
        soldQty,
        remaining,
        purchasePrice: toNum(cell(row, cols.purchasePrice)),
        salePrice: toNum(cell(row, cols.salePrice)),
        unitProfit: toNum(cell(row, cols.unitProfit)),
        revenue: toNum(cell(row, cols.revenue)),
        adrianInvestPlusProfit: toNum(cell(row, cols.adrianInvProfit)),
        profitAlejandro: toNum(cell(row, cols.profitAlejandro)),
        storeShare: toNum(cell(row, cols.storeShare)),
        adrianInvestment: toNum(cell(row, cols.adrianInvestment)),
        profitAdrian: toNum(cell(row, cols.profitAdrian)),
      });
    }

    drafts.push({
      index: info.index,
      title: findTitleText(rows[r]) ?? `Corte ${info.index}`,
      exchangeRate: info.exchangeRate,
      startDate: info.startDate,
      endDate: info.endDate,
      lines,
    });

    r = p - 1;
  }

  drafts.sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Algunos locales titulan el corte con una sola fecha (sin rango); se completa el fin con
  // el inicio del corte siguiente, o con su propio inicio si es el último (período abierto).
  for (let i = 0; i < drafts.length; i++) {
    if (drafts[i].endDate == null) {
      drafts[i].endDate = i + 1 < drafts.length ? drafts[i + 1].startDate : drafts[i].startDate;
    }
  }

  const cortes: Corte[] = drafts.map((d, i) => ({
    id: i + 1,
    index: d.index,
    title: d.title,
    exchangeRate: d.exchangeRate,
    startDate: d.startDate,
    endDate: d.endDate as string,
    days: Math.max(1, diffDays(d.startDate, d.endDate as string)),
    lines: d.lines,
  }));

  for (let i = 1; i < cortes.length; i++) {
    const prev = cortes[i - 1];
    const curr = cortes[i];
    const prevRemaining = new Map(prev.lines.map((l) => [l.product, l.remaining]));
    for (const line of curr.lines) {
      const expected = prevRemaining.get(line.product);
      // Un stock inicial mayor al restante previo es normal (hubo reposición/compra);
      // solo es sospechoso si el stock inicial es MENOR al restante previo (inventario "perdido").
      if (expected !== undefined && line.initialStock < expected) {
        warnings.push(
          `${sheetName}: discontinuidad de stock para "${line.product}" entre corte ${prev.index} (restante ${expected}) y corte ${curr.index} (inicial ${line.initialStock})`,
        );
      }
    }
  }

  return { cortes, warnings };
}

function findTitleText(row: unknown[]): string | null {
  for (let c = 0; c < Math.min(row.length, 8); c++) {
    if (parseCorteTitle(row[c])) return String(row[c]);
  }
  return null;
}
