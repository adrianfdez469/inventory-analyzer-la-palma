import type * as XLSX from "xlsx";
import { utils } from "xlsx";
import type { ResumenRow } from "../types.js";
import { toNum } from "./utils.js";

export function parseResumenSheet(ws: XLSX.WorkSheet): ResumenRow[] {
  const rows: unknown[][] = utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });
  const result: ResumenRow[] = [];

  for (const row of rows) {
    if (!row) continue;
    const h = row[7];
    if (typeof h !== "string" || !/^corte/i.test(h.trim())) continue;

    result.push({
      corte: h.trim(),
      totalSales: toNum(row[1]),
      moneyReceived: toNum(row[2]),
      investment: toNum(row[3]),
      profitAlejandro: toNum(row[4]),
      profitAdrian: toNum(row[5]),
      profitPct: toNum(row[6]),
    });
  }

  return result;
}
