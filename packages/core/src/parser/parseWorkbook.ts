import { read } from "xlsx";
import type { InventorySnapshot } from "../types.js";
import { InventoryParseError } from "../types.js";
import { norm } from "./utils.js";
import { parseCortesSheet } from "./cortes.js";
import { parseInversionSheet } from "./inversion.js";
import { parseResumenSheet } from "./resumen.js";

export interface ParseWorkbookOptions {
  fileName?: string;
}

export function parseWorkbook(
  data: Uint8Array,
  opts: ParseWorkbookOptions = {},
): InventorySnapshot {
  const workbook = read(data, { cellDates: true });
  const warnings: string[] = [];

  const sheetByNorm = new Map(
    workbook.SheetNames.map((name) => [norm(name), name] as const),
  );

  let productosSheetName = sheetByNorm.get("productos usd");
  let sourceCurrency: "USD" | "CUP" = "USD";
  if (!productosSheetName) {
    productosSheetName = sheetByNorm.get("productos cup");
    if (productosSheetName) {
      sourceCurrency = "CUP";
      warnings.push(
        'No se encontró la hoja "Productos USD"; usando "Productos CUP" como respaldo.',
      );
    }
  }
  if (!productosSheetName) {
    throw new InventoryParseError(
      'No se encontró la hoja "Productos USD" ni "Productos CUP" en el archivo.',
    );
  }

  const { cortes, warnings: corteWarnings } = parseCortesSheet(
    workbook.Sheets[productosSheetName],
    productosSheetName,
  );
  warnings.push(...corteWarnings);

  const inversionSheetName = workbook.SheetNames.find((name) =>
    norm(name).includes("inversion"),
  );
  let purchases: InventorySnapshot["purchases"] = [];
  if (inversionSheetName) {
    const { purchases: parsedPurchases, warnings: inversionWarnings } =
      parseInversionSheet(workbook.Sheets[inversionSheetName]);
    purchases = parsedPurchases;
    warnings.push(...inversionWarnings);
  } else {
    warnings.push('No se encontró la hoja "Inversion".');
  }

  const resumenSheetName = workbook.SheetNames.find((name) =>
    norm(name).startsWith("ganancias"),
  );
  const resumen = resumenSheetName
    ? parseResumenSheet(workbook.Sheets[resumenSheetName])
    : [];

  return {
    version: 1,
    fileName: opts.fileName ?? "inventario.xlsx",
    importedAt: new Date().toISOString(),
    sourceCurrency,
    cortes,
    purchases,
    resumen,
    warnings,
  };
}
