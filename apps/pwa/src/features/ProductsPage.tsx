import type { ProductAnalytics, Quadrant } from "@inventory/core";
import { useAnalytics } from "../AnalyticsContext.js";
import { useAppStore } from "../store/appStore.js";
import { fmtDate, fmtPct, fmtQty, money } from "../lib/format.js";
import { EmptyState, QUADRANT_LABELS, QuadrantBadge } from "../components/ui.js";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";

export function ProductsPage() {
  const analytics = useAnalytics();
  const currency = useAppStore((s) => s.currency);
  const setDetailProduct = useAppStore((s) => s.setDetailProduct);

  if (!analytics) {
    return <EmptyState title="No hay datos" description="Importa un Excel primero." />;
  }

  const rate = analytics.displayRate;

  const columns: DataTableColumn<ProductAnalytics>[] = [
    {
      key: "product",
      label: "Producto",
      value: (p) => p.product,
      render: (p) => <span className="font-medium text-slate-100">{p.product}</span>,
    },
    {
      key: "unitsSold",
      label: "Vendidos",
      type: "number",
      value: (p) => p.unitsSold,
      render: (p) => fmtQty(p.unitsSold),
    },
    {
      key: "unitsPerDay",
      label: "Uds/día",
      type: "number",
      value: (p) => p.unitsPerDay,
      render: (p) => fmtQty(p.unitsPerDay),
    },
    {
      key: "daysSinceLastSale",
      label: "Días sin vender",
      type: "number",
      value: (p) => (p.neverSold ? null : p.daysSinceLastSale),
      render: (p) => (p.neverSold ? "Nunca vendido" : `${p.daysSinceLastSale ?? "—"} días`),
    },
    {
      key: "stockRemaining",
      label: "Stock",
      type: "number",
      value: (p) => p.stockRemaining,
      render: (p) => fmtQty(p.stockRemaining),
    },
    {
      key: "stockValueAtCost",
      label: "Valor stock",
      type: "number",
      value: (p) => p.stockValueAtCost,
      render: (p) => money(p.stockValueAtCost, currency, rate),
    },
    {
      key: "lastPurchasePrice",
      label: "Última compra USD",
      type: "number",
      value: (p) => p.lastPurchasePrice,
      render: (p) => money(p.lastPurchasePrice, "USD", rate),
    },
    {
      key: "profit",
      label: "Ganancia",
      type: "number",
      value: (p) => p.profit,
      render: (p) => money(p.profit, currency, rate),
    },
    {
      key: "profitPerDay",
      label: "Ganancia/día",
      type: "number",
      value: (p) => p.profitPerDay,
      render: (p) => money(p.profitPerDay, currency, rate),
    },
    {
      key: "marginPct",
      label: "Margen%",
      type: "number",
      value: (p) => p.marginPct,
      render: (p) => fmtPct(p.marginPct),
    },
    {
      key: "quadrant",
      label: "Cuadrante",
      type: "select",
      value: (p) => p.quadrant,
      optionLabel: (raw) => QUADRANT_LABELS[raw as Quadrant] ?? raw,
      render: (p) => <QuadrantBadge quadrant={p.quadrant} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <DataTable
        columns={columns}
        rows={analytics.products}
        rowKey={(p) => p.product}
        onRowClick={(p) => setDetailProduct(p.product)}
        defaultSortKey="profitPerDay"
        emptyMessage="No hay productos en el rango seleccionado."
      />
      <p className="text-xs text-slate-500">
        Rango analizado: {fmtDate(analytics.totals.rangeStart)} –{" "}
        {fmtDate(analytics.totals.rangeEnd)}
      </p>
    </div>
  );
}
