import type * as XLSX from "xlsx";
import { utils } from "xlsx";
import type { ResumenRow } from "../types.js";
import { norm, toNum } from "./utils.js";

interface ColumnMap {
  totalSales: number;
  moneyReceived: number;
  investment: number;
  profitPct: number;
  corte: number;
  /** Una columna (dueño único, formato legado) o dos (Alejandro + Adrian, formato actual) */
  profitCols: number[];
}

function mapColumns(headerRow: unknown[]): ColumnMap {
  const normalized = headerRow.map((h) => norm(h));
  const find = (pred: (h: string) => boolean) => {
    const idx = normalized.findIndex((h) => h && pred(h));
    return idx;
  };

  return {
    totalSales: find((h) => h === "ventas totales"),
    moneyReceived: find((h) => h === "dinero recibido total"),
    investment: find((h) => h === "inversion"),
    profitPct: find((h) => h.startsWith("% de ganancia")),
    corte: find((h) => h.startsWith("# de corte")),
    // "Ganacias/Ganancias CUP[ Alejandro|Adrian]": una o dos columnas según el archivo tenga
    // un solo dueño (formato legado) o dos socios con reparto (formato actual).
    profitCols: normalized
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => h.startsWith("ganacias cup") || h.startsWith("ganancias cup"))
      .map(({ i }) => i),
  };
}

function cell(row: unknown[] | undefined, idx: number | undefined): unknown {
  if (row == null || idx == null || idx < 0) return null;
  return row[idx] ?? null;
}

export function parseResumenSheet(ws: XLSX.WorkSheet): ResumenRow[] {
  const rows: unknown[][] = utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });
  const result: ResumenRow[] = [];

  const headerRowIdx = rows.findIndex(
    (row) => row && row.some((c) => norm(c) === "ventas totales"),
  );
  if (headerRowIdx === -1) return result;

  const cols = mapColumns(rows[headerRowIdx]);
  const [profitAlejandroCol, profitAdrianCol] = cols.profitCols;

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const h = cell(row, cols.corte);
    if (typeof h !== "string" || !/^corte/i.test(h.trim())) continue;

    const totalSales = toNum(cell(row, cols.totalSales));
    const moneyReceived = toNum(cell(row, cols.moneyReceived));
    const investment = toNum(cell(row, cols.investment));
    // Filas de plantilla para cortes futuros aún sin llenar: cortar acá.
    if (totalSales == null && moneyReceived == null && investment == null) break;

    result.push({
      corte: h.trim(),
      totalSales,
      moneyReceived,
      investment,
      profitAlejandro: toNum(cell(row, profitAlejandroCol)),
      profitAdrian: toNum(cell(row, profitAdrianCol)),
      profitPct: toNum(cell(row, cols.profitPct)),
    });
  }

  return result;
}
