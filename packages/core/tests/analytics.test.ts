import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "../src/parser/parseWorkbook.js";
import { computeAnalytics } from "../src/analytics/metrics.js";

const fixtureUrl = new URL("./fixtures/ferreteria.xlsx", import.meta.url);
const hasFixture = existsSync(fixtureUrl);

function loadSnapshot() {
  const fixture = readFileSync(fixtureUrl);
  return parseWorkbook(new Uint8Array(fixture), { fileName: "ferreteria.xlsx" });
}

// El fixture es una copia real del Excel del negocio; no se sube al repo público
// (ver .gitignore), así que estos tests solo corren cuando el archivo existe localmente.
describe.skipIf(!hasFixture)("computeAnalytics (sin filtros)", () => {
  it("calcula los totales agregados", () => {
    const analytics = computeAnalytics(loadSnapshot(), {});
    expect(analytics.totals.unitsSold).toBe(59);
    expect(analytics.totals.revenue).toBeCloseTo(258.43, 1);
  });

  it("calcula la ganancia de Adrian en el corte 1", () => {
    const analytics = computeAnalytics(loadSnapshot(), {});
    const c1 = analytics.corteAggregates.find((c) => c.index === 1)!;
    const c1Lines = analytics.cortes.find((c) => c.index === 1)!.lines;
    const profitAdrian = c1Lines.reduce((sum, l) => sum + (l.profitAdrian ?? 0), 0);
    expect(profitAdrian).toBeCloseTo(11.549, 2);
    expect(c1).toBeDefined();
  });

  it("el ranking más jugoso encabeza con Bombilla recargable 15W", () => {
    const analytics = computeAnalytics(loadSnapshot(), {});
    expect(analytics.rankings.juiciest[0].product).toBe("Bombilla recargable 15W");
    expect(analytics.rankings.juiciest[0].profitPerDay).toBeCloseTo(1.91, 2);
  });

  it("el Taladro Percutor tiene profitPerDay ≈1.76", () => {
    const analytics = computeAnalytics(loadSnapshot(), {});
    const taladro = analytics.products.find((p) => p.product === "Taladro Percutor")!;
    expect(taladro.profitPerDay).toBeCloseTo(1.76, 2);
  });

  it("sugiere reponer Caja de breaker de 8 posiciones e Interruptor Simple", () => {
    const analytics = computeAnalytics(loadSnapshot(), {});
    expect(analytics.restock.map((r) => r.product.product)).toEqual([
      "Caja de breaker de 8 posiciones",
      "Interruptor Simple",
    ]);
    expect(analytics.restock[0].product.daysOfCover).toBeCloseTo(8, 0);
    expect(analytics.restock[1].product.daysOfCover).toBeCloseTo(15, 0);
  });
});

describe.skipIf(!hasFixture)("computeAnalytics (con filtros)", () => {
  it("filtra por corte específico", () => {
    const analytics = computeAnalytics(loadSnapshot(), { cortes: [1] });
    expect(analytics.totals.unitsSold).toBe(20);
  });

  it("filtra por rango de fechas", () => {
    const analytics = computeAnalytics(loadSnapshot(), { from: "2026-03-31" });
    expect(analytics.totals.unitsSold).toBe(39);
  });

  it("agrega warning cuando ningún corte cumple el filtro", () => {
    const analytics = computeAnalytics(loadSnapshot(), { from: "2099-01-01" });
    expect(analytics.totals.unitsSold).toBe(0);
    expect(analytics.warnings).toContain("Ningún corte cumple el filtro seleccionado.");
  });
});
