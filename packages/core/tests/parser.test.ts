import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "../src/parser/parseWorkbook.js";
import { diffDays, parseCorteTitle, toISODate, toNum } from "../src/parser/utils.js";

const fixtureUrl = new URL("./fixtures/ferreteria.xlsx", import.meta.url);
const hasFixture = existsSync(fixtureUrl);

function loadPalma() {
  const fixture = readFileSync(fixtureUrl);
  const snapshot = parseWorkbook(new Uint8Array(fixture), { fileName: "ferreteria.xlsx" });
  return snapshot.locations.find((l) => l.id === "palma")!;
}

// El fixture es una copia real del Excel del negocio; no se sube al repo público
// (ver .gitignore), así que estos tests solo corren cuando el archivo existe localmente.
// Este fixture usa el formato viejo sin nombre de local ("Productos USD") — sirve de test de
// regresión: debe seguir detectándose como el local "palma" por defecto.
describe.skipIf(!hasFixture)("parseWorkbook (formato de un solo local, sin nombre)", () => {
  it("detecta un único local 'palma' con 18 compras y 3 cortes sin warnings", () => {
    const palma = loadPalma();
    expect(palma.id).toBe("palma");
    expect(palma.purchases).toHaveLength(18);
    expect(palma.cortes).toHaveLength(3);
    expect(palma.warnings).toEqual([]);
  });

  it("parsea correctamente el corte 1", () => {
    const palma = loadPalma();
    const c1 = palma.cortes.find((c) => c.id === 1)!;
    expect(c1.index).toBe(1);
    expect(c1.exchangeRate).toBe(515);
    expect(c1.startDate).toBe("2026-03-28");
    expect(c1.endDate).toBe("2026-03-30");
    expect(c1.days).toBe(2);
    expect(c1.lines).toHaveLength(11);
  });

  it("parsea correctamente el corte 2", () => {
    const palma = loadPalma();
    const c2 = palma.cortes.find((c) => c.id === 2)!;
    expect(c2.lines).toHaveLength(18);
    expect(c2.days).toBe(3);
  });

  it("corte 3 no tiene ventas", () => {
    const palma = loadPalma();
    const c3 = palma.cortes.find((c) => c.id === 3)!;
    expect(c3.lines).toHaveLength(18);
    const unitsSold = c3.lines.reduce((sum, l) => sum + l.soldQty, 0);
    expect(unitsSold).toBe(0);
  });

  it("parsea el Taladro Percutor con su precio y proveedor", () => {
    const palma = loadPalma();
    const taladro = palma.purchases.find((p) => p.product === "Taladro Percutor")!;
    expect(taladro.purchasePriceUSD).toBeCloseTo(28, 2);
    expect(taladro.supplier).toBe("habalu");
  });
});

describe("utils", () => {
  it("toNum ignora errores de fórmula", () => {
    expect(toNum("#DIV/0!")).toBeNull();
    expect(toNum("#REF!")).toBeNull();
    expect(toNum(42)).toBe(42);
    expect(toNum("1.234,56")).toBeCloseTo(1234.56, 2);
  });

  it("parseCorteTitle extrae índice, tasa y fechas (rango completo)", () => {
    const info = parseCorteTitle("Corte 2 (515) 30/03/26 - 2/04/26");
    expect(info).toEqual({
      index: 2,
      exchangeRate: 515,
      startDate: "2026-03-30",
      endDate: "2026-04-02",
    });
  });

  it("parseCorteTitle acepta una sola fecha (sin rango)", () => {
    const info = parseCorteTitle("Corte 1(523) 14/04/26");
    expect(info).toEqual({
      index: 1,
      exchangeRate: 523,
      startDate: "2026-04-14",
      endDate: null,
    });
  });

  it("toISODate convierte fechas dd/mm/yy", () => {
    expect(toISODate("28/03/26")).toBe("2026-03-28");
  });

  it("diffDays calcula la diferencia en días", () => {
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
  });
});
