import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "../src/parser/parseWorkbook.js";
import { computeAnalytics } from "../src/analytics/metrics.js";

const fixtureUrl = new URL("./fixtures/ferreteria-multilocal.xlsx", import.meta.url);
const hasFixture = existsSync(fixtureUrl);

function load() {
  const fixture = readFileSync(fixtureUrl);
  return parseWorkbook(new Uint8Array(fixture), { fileName: "ferreteria-multilocal.xlsx" });
}

// Excel real con 3 locales (Palma, Leo, Vedado); no se sube al repo público (ver .gitignore),
// así que estos tests solo corren cuando el archivo existe localmente.
describe.skipIf(!hasFixture)("parseWorkbook (multi-local)", () => {
  it("descubre los 3 locales sin warnings globales", () => {
    const snapshot = load();
    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.locations.map((l) => l.id)).toEqual(["palma", "vedado", "leo"]);
  });

  it("Palma: 44 cortes, 40 compras, 101 productos, ids de corte sin huecos", () => {
    const palma = load().locations.find((l) => l.id === "palma")!;
    expect(palma.cortes).toHaveLength(44);
    expect(palma.purchases).toHaveLength(40);
    expect(palma.cortes.map((c) => c.id)).toEqual(Array.from({ length: 44 }, (_, i) => i + 1));
    const products = new Set(palma.cortes.flatMap((c) => c.lines.map((l) => l.product)));
    expect(products.size).toBe(101);
  });

  it("Palma: la hoja de resumen corta antes de las filas de plantilla vacía", () => {
    const palma = load().locations.find((l) => l.id === "palma")!;
    expect(palma.resumen).toHaveLength(44);
    expect(palma.resumen.every((r) => r.totalSales != null)).toBe(true);
  });

  it("Leo: reinicia su numeración de corte pero los ids quedan únicos", () => {
    const leo = load().locations.find((l) => l.id === "leo")!;
    expect(leo.cortes).toHaveLength(30);
    const repeatedIndexes = leo.cortes.filter(
      (c) => leo.cortes.filter((other) => other.index === c.index).length > 1,
    );
    expect(repeatedIndexes.length).toBeGreaterThan(0); // confirma que el reinicio real está presente
    expect(new Set(leo.cortes.map((c) => c.id)).size).toBe(leo.cortes.length);
    // Leo no tiene hoja de Inversion ni de Ganancias propia en este archivo
    expect(leo.purchases).toEqual([]);
    expect(leo.resumen).toEqual([]);
  });

  it("Vedado: títulos de un solo día se completan con el corte siguiente", () => {
    const vedado = load().locations.find((l) => l.id === "vedado")!;
    expect(vedado.cortes).toHaveLength(13);
    expect(vedado.cortes.every((c) => c.endDate != null)).toBe(true);
    expect(vedado.cortes[0]).toMatchObject({
      id: 1,
      startDate: "2026-04-14",
      endDate: "2026-04-21", // = inicio del corte 2
      days: 7,
    });
  });

  it('Vedado: el alias "Dinero Tienda 12%" se mapea igual que "Dinero Tienda 50%"', () => {
    const vedado = load().locations.find((l) => l.id === "vedado")!;
    const hasStoreShare = vedado.cortes.some((c) => c.lines.some((l) => l.storeShare != null));
    expect(hasStoreShare).toBe(true);
  });
});

describe.skipIf(!hasFixture)("computeAnalytics (multi-local)", () => {
  it("cada local produce analítica independiente y consistente", () => {
    const snapshot = load();
    const palma = snapshot.locations.find((l) => l.id === "palma")!;
    const vedado = snapshot.locations.find((l) => l.id === "vedado")!;
    const leo = snapshot.locations.find((l) => l.id === "leo")!;

    const palmaAnalytics = computeAnalytics(palma, {});
    const vedadoAnalytics = computeAnalytics(vedado, {});
    const leoAnalytics = computeAnalytics(leo, {});

    expect(palmaAnalytics.totals.productsTracked).toBe(101);
    expect(vedadoAnalytics.totals.productsTracked).toBe(17);
    expect(leoAnalytics.totals.productsTracked).toBe(65);

    // Vedado no tiene compras (Inversion) propias en este archivo -> sin inversión en rango.
    expect(vedadoAnalytics.totals.investmentInRange).toBe(0);
  });
});
