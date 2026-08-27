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

    const totalSales = toNum(row[1]);
    const moneyReceived = toNum(row[2]);
    const investment = toNum(row[3]);
    // Filas de plantilla para cortes futuros aún sin llenar: cortar acá.
    if (totalSales == null && moneyReceived == null && investment == null) break;

    result.push({
      corte: h.trim(),
      totalSales,
      moneyReceived,
      investment,
      profitAlejandro: toNum(row[4]),
      profitAdrian: toNum(row[5]),
      profitPct: toNum(row[6]),
    });
  }

  return result;
}
