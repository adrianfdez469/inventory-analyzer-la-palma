import { useMemo, useState } from "react";
import type { ProductAnalytics } from "@inventory/core";
import { useAnalytics } from "../AnalyticsContext.js";
import { useAppStore } from "../store/appStore.js";
import { fmtDate, fmtPct, fmtQty, money } from "../lib/format.js";
import { EmptyState, QuadrantBadge } from "../components/ui.js";

type SortKey =
  | "product"
  | "unitsSold"
  | "unitsPerDay"
  | "daysSinceLastSale"
  | "stockRemaining"
  | "stockValueAtCost"
  | "lastPurchasePrice"
  | "profit"
  | "profitPerDay"
  | "marginPct";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "product", label: "Producto" },
  { key: "unitsSold", label: "Vendidos" },
  { key: "unitsPerDay", label: "Uds/día" },
  { key: "daysSinceLastSale", label: "Días sin vender" },
  { key: "stockRemaining", label: "Stock" },
  { key: "stockValueAtCost", label: "Valor stock" },
  { key: "lastPurchasePrice", label: "Última compra USD" },
  { key: "profit", label: "Ganancia" },
  { key: "profitPerDay", label: "Ganancia/día" },
  { key: "marginPct", label: "Margen%" },
];

function sortValue(p: ProductAnalytics, key: SortKey): number | string {
  const v = p[key];
  if (v == null) return key === "product" ? "" : -Infinity;
  return v;
}

export function ProductsPage() {
  const analytics = useAnalytics();
  const currency = useAppStore((s) => s.currency);
  const setDetailProduct = useAppStore((s) => s.setDetailProduct);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("profitPerDay");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const rows = useMemo(() => {
    if (!analytics) return [];
    const filtered = analytics.products.filter((p) =>
      p.product.toLowerCase().includes(query.toLowerCase()),
    );
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }, [analytics, query, sortKey, sortDir]);

  if (!analytics) {
    return <EmptyState title="No hay datos" description="Importa un Excel primero." />;
  }

  const rate = analytics.displayRate;

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <input
        className="input max-w-xs"
        placeholder="Buscar producto…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              {COLUMNS.map((c) => (
                <th key={c.key} className="th" onClick={() => toggleSort(c.key)}>
                  {c.label} {sortKey === c.key ? (sortDir === 1 ? "▲" : "▼") : ""}
                </th>
              ))}
              <th className="th">Cuadrante</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.product}
                className="cursor-pointer border-b border-slate-900 hover:bg-slate-800/40"
                onClick={() => setDetailProduct(p.product)}
              >
                <td className="td font-medium text-slate-100">{p.product}</td>
                <td className="td">{fmtQty(p.unitsSold)}</td>
                <td className="td">{fmtQty(p.unitsPerDay)}</td>
                <td className="td">
                  {p.neverSold ? "Nunca vendido" : `${p.daysSinceLastSale ?? "—"} días`}
                </td>
                <td className="td">{fmtQty(p.stockRemaining)}</td>
                <td className="td">{money(p.stockValueAtCost, currency, rate)}</td>
                <td className="td">{money(p.lastPurchasePrice, "USD", rate)}</td>
                <td className="td">{money(p.profit, currency, rate)}</td>
                <td className="td">{money(p.profitPerDay, currency, rate)}</td>
                <td className="td">{fmtPct(p.marginPct)}</td>
                <td className="td">
                  <QuadrantBadge quadrant={p.quadrant} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={COLUMNS.length + 1}>
                  Sin productos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Rango analizado: {fmtDate(analytics.totals.rangeStart)} –{" "}
        {fmtDate(analytics.totals.rangeEnd)}
      </p>
    </div>
  );
}
