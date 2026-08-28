import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "../src/parser/parseWorkbook.js";

const fixtureUrl = new URL("./fixtures/ferreteria-alejandro.xlsx", import.meta.url);
const hasFixture = existsSync(fixtureUrl);

function load() {
  const fixture = readFileSync(fixtureUrl);
  return parseWorkbook(new Uint8Array(fixture), { fileName: "ferreteria-alejandro.xlsx" });
}

// Excel real de una época anterior a la sociedad con Adrian (un solo dueño/inversor, "Alejandro").
// Mismo negocio (Palma/Leo/Vedado) pero con las hojas de producto nombradas "Productos <Moneda>
// <Local>" (moneda antes del local) y sin columna de reparto entre dos socios. No se sube al
// repo público (ver .gitignore), así que estos tests solo corren cuando el archivo existe local.
describe.skipIf(!hasFixture)("parseWorkbook (formato legado, un solo dueño)", () => {
  it("descubre los 3 locales pese al orden invertido de moneda/local en el nombre de hoja", () => {
    const snapshot = load();
    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.locations.map((l) => l.id)).toEqual(["palma", "vedado", "leo"]);
  });

  it("Palma: cortes, compras y productos se parsean correctamente", () => {
    const palma = load().locations.find((l) => l.id === "palma")!;
    expect(palma.cortes.length).toBe(49);
    expect(palma.purchases.length).toBe(48);
    const products = new Set(palma.cortes.flatMap((c) => c.lines.map((l) => l.product)));
    expect(products.size).toBe(124);
  });

  it("Vedado y Leo: cortes con títulos de una sola fecha se parsean igual que en el formato actual", () => {
    const vedado = load().locations.find((l) => l.id === "vedado")!;
    const leo = load().locations.find((l) => l.id === "leo")!;
    expect(vedado.cortes.length).toBe(13);
    expect(vedado.cortes.every((c) => c.endDate != null)).toBe(true);
    expect(leo.cortes.length).toBe(8);
    expect(leo.cortes.every((c) => c.endDate != null)).toBe(true);
  });

  it("mapea las columnas de reparto de dueño único (Ale) a los campos existentes", () => {
    const palma = load().locations.find((l) => l.id === "palma")!;
    const bombas = palma.cortes[0].lines.find((l) =>
      l.product.startsWith("Bombas autocebantes"),
    )!;
    expect(bombas).toMatchObject({
      initialStock: 8,
      soldQty: 1,
      remaining: 7,
      purchasePrice: 40,
      unitProfit: 25.882352941176464,
      // "Dinero Ale 50%" / "Inversion ale" / "Ganancia Ale" -> mismos campos que usa el
      // formato actual para el rol de inversor ("Adrian"); no hay columna de segundo socio.
      adrianInvestPlusProfit: 52.94117647058823,
      adrianInvestment: 40,
      profitAdrian: 12.941176470588232,
      profitAlejandro: null,
    });
  });

  it("hoja de resumen (Ganancias): una sola columna de ganancia se asigna a profitAlejandro", () => {
    const palma = load().locations.find((l) => l.id === "palma")!;
    expect(palma.resumen.length).toBeGreaterThan(0);
    expect(palma.resumen[0]).toMatchObject({
      corte: "Corte 1",
      totalSales: 694480,
      moneyReceived: 572652.15,
      investment: 450824.30000000005,
      profitAlejandro: 121827.85,
      profitAdrian: null,
    });
  });
});
