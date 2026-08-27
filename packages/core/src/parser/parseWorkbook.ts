import { read } from "xlsx";
import type { Currency, InventorySnapshot, LocationSnapshot } from "../types.js";
import { InventoryParseError } from "../types.js";
import { norm } from "./utils.js";
import { parseCortesSheet } from "./cortes.js";
import { parseInversionSheet } from "./inversion.js";
import { parseResumenSheet } from "./resumen.js";

export interface ParseWorkbookOptions {
  fileName?: string;
}

// Nombre "limpio" para hacer matching de hojas: espacios colapsados, sin espacios al borde
// (varias hojas del archivo real traen espacios sueltos, ej. "Productos Leo USD ").
function cleanSheetName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

// Detecta hojas de productos con o sin nombre de local: "Productos USD" (formato viejo,
// un solo negocio) o "Productos <Local> USD/CUP" / "Producto <Local> USD/CUP" (varios locales).
const PRODUCT_SHEET_RE = /^productos?(?:\s+(.+?))?\s+(usd|cup)$/i;

const DEFAULT_LOCATION_ID = "palma";
const DEFAULT_LOCATION_LABEL = "Palma";

interface ProductSheetMatch {
  rawName: string;
  locationId: string;
  locationLabel: string;
  currency: Currency;
}

function findProductSheets(sheetNames: string[], hidden: Set<string>): ProductSheetMatch[] {
  const matches: ProductSheetMatch[] = [];
  for (const rawName of sheetNames) {
    if (hidden.has(rawName)) continue;
    const clean = cleanSheetName(rawName);
    const m = PRODUCT_SHEET_RE.exec(clean);
    if (!m) continue;
    const locationLabel = m[1]?.trim() || DEFAULT_LOCATION_LABEL;
    const locationId = m[1]?.trim() ? norm(locationLabel) : DEFAULT_LOCATION_ID;
    const currency: Currency = /usd/i.test(m[2]) ? "USD" : "CUP";
    matches.push({ rawName, locationId, locationLabel, currency });
  }
  return matches;
}

function getHiddenSheetNames(workbook: ReturnType<typeof read>): Set<string> {
  const sheets = workbook.Workbook?.Sheets ?? [];
  return new Set(sheets.filter((s) => s.Hidden).map((s) => s.name!).filter(Boolean));
}

export function parseWorkbook(
  data: Uint8Array,
  opts: ParseWorkbookOptions = {},
): InventorySnapshot {
  const workbook = read(data, { cellDates: true });
  const globalWarnings: string[] = [];
  const hidden = getHiddenSheetNames(workbook);

  const productSheets = findProductSheets(workbook.SheetNames, hidden);
  if (productSheets.length === 0) {
    throw new InventoryParseError(
      'No se encontró ninguna hoja de productos (formato "Productos <Local> USD/CUP").',
    );
  }

  const byLocation = new Map<string, { usd?: ProductSheetMatch; cup?: ProductSheetMatch }>();
  for (const s of productSheets) {
    const entry = byLocation.get(s.locationId) ?? {};
    if (s.currency === "USD") entry.usd = s;
    else entry.cup = s;
    byLocation.set(s.locationId, entry);
  }

  const locations: LocationSnapshot[] = [];

  for (const [locationId, { usd, cup }] of byLocation) {
    const warnings: string[] = [];
    const chosen = usd ?? cup;
    if (!chosen) continue; // no debería pasar, defensivo
    const sourceCurrency: Currency = usd ? "USD" : "CUP";
    if (!usd && cup) {
      warnings.push(
        `No se encontró la hoja de productos en USD para "${cup.locationLabel}"; usando CUP como respaldo.`,
      );
    }

    const { cortes, warnings: corteWarnings } = parseCortesSheet(
      workbook.Sheets[chosen.rawName],
      chosen.rawName,
    );
    warnings.push(...corteWarnings);

    const resumenSheetName = workbook.SheetNames.find(
      (name) =>
        !hidden.has(name) &&
        norm(name).startsWith("ganancias") &&
        norm(name).includes(locationId),
    );
    const resumen = resumenSheetName ? parseResumenSheet(workbook.Sheets[resumenSheetName]) : [];

    locations.push({
      id: locationId,
      label: chosen.locationLabel,
      sourceCurrency,
      cortes,
      purchases: [],
      resumen,
      warnings,
    });
  }

  // La hoja "Inversion" (sin sufijo de local) es históricamente el registro de compras del
  // negocio original; si aparece "Inversion <Local>" en el futuro, se asocia a ese local.
  const inversionSheets = workbook.SheetNames.filter(
    (name) => !hidden.has(name) && /^inversion(\s+.+)?$/i.test(cleanSheetName(name)),
  );
  for (const rawName of inversionSheets) {
    const clean = cleanSheetName(rawName);
    const m = /^inversion\s+(.+)$/i.exec(clean);
    const targetId = m ? norm(m[1]) : DEFAULT_LOCATION_ID;
    const target = locations.find((l) => l.id === targetId);
    if (!target) {
      globalWarnings.push(
        `No se pudo asociar la hoja "${rawName}" a ningún local (se esperaba el local "${targetId}").`,
      );
      continue;
    }
    const { purchases, warnings: inversionWarnings } = parseInversionSheet(
      workbook.Sheets[rawName],
    );
    target.purchases = purchases;
    target.warnings.push(...inversionWarnings);
  }

  locations.sort((a, b) => {
    if (a.id === DEFAULT_LOCATION_ID) return -1;
    if (b.id === DEFAULT_LOCATION_ID) return 1;
    return 0;
  });

  return {
    version: 2,
    fileName: opts.fileName ?? "inventario.xlsx",
    importedAt: new Date().toISOString(),
    locations,
    warnings: globalWarnings,
  };
}
