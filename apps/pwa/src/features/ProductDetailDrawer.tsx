import type { CorteProductRecord, Purchase } from "@inventory/core";
import { useAnalytics } from "../AnalyticsContext.js";
import { useAppStore } from "../store/appStore.js";
import { fmtDate, fmtPct, fmtQty, money } from "../lib/format.js";
import { QuadrantBadge } from "../components/ui.js";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";

export function ProductDetailDrawer() {
  const analytics = useAnalytics();
  const currency = useAppStore((s) => s.currency);
  const detailProduct = useAppStore((s) => s.detailProduct);
  const setDetailProduct = useAppStore((s) => s.setDetailProduct);

  if (!detailProduct || !analytics) return null;

  const product = analytics.products.find((p) => p.product === detailProduct);
  if (!product) return null;

  const rate = analytics.displayRate;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/60">
      <button
        className="absolute inset-0"
        aria-label="Cerrar"
        onClick={() => setDetailProduct(null)}
      />
      <div className="relative z-50 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-slate-800 bg-slate-950 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">{product.product}</h2>
            <QuadrantBadge quadrant={product.quadrant} />
          </div>
          <button className="btn-secondary" onClick={() => setDetailProduct(null)}>
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="card">
            <div className="text-xs text-slate-500">Vendidos</div>
            <div className="text-slate-100">{fmtQty(product.unitsSold)} uds</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500">Uds/día</div>
            <div className="text-slate-100">{fmtQty(product.unitsPerDay)}</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500">Ganancia</div>
            <div className="text-slate-100">{money(product.profit, currency, rate)}</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500">Ganancia/día</div>
            <div className="text-slate-100">
              {money(product.profitPerDay, currency, rate)}
            </div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500">Margen</div>
            <div className="text-slate-100">{fmtPct(product.marginPct)}</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500">Stock actual</div>
            <div className="text-slate-100">{fmtQty(product.stockRemaining)} uds</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500">Valor stock</div>
            <div className="text-slate-100">
              {money(product.stockValueAtCost, currency, rate)}
            </div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500">Días sin vender</div>
            <div className="text-slate-100">
              {product.neverSold ? "Nunca vendido" : `${product.daysSinceLastSale} días`}
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-300">
            Historial de precio de compra (USD)
          </h3>
          <PurchaseHistoryTable history={product.purchasePrice.history} rate={rate} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-300">Evolución por corte</h3>
          <PerCorteTable perCorte={product.perCorte} currency={currency} rate={rate} />
        </div>
      </div>
    </div>
  );
}

function PurchaseHistoryTable({
  history,
  rate,
}: {
  history: Purchase[];
  rate: number | null;
}) {
  const columns: DataTableColumn<Purchase>[] = [
    {
      key: "date",
      label: "Fecha",
      value: (h) => h.date,
      render: (h) => fmtDate(h.date),
    },
    { key: "quantity", label: "Cantidad", type: "number", value: (h) => h.quantity },
    {
      key: "purchasePriceUSD",
      label: "Precio",
      type: "number",
      value: (h) => h.purchasePriceUSD,
      render: (h) => money(h.purchasePriceUSD, "USD", rate),
    },
    { key: "exchangeRate", label: "Tasa", type: "number", value: (h) => h.exchangeRate },
    { key: "supplier", label: "Proveedor", value: (h) => h.supplier },
  ];

  return (
    <DataTable
      columns={columns}
      rows={history}
      rowKey={(h, i) => `${h.date ?? ""}-${h.supplier ?? ""}-${i}`}
      emptyMessage="Sin compras registradas."
    />
  );
}

function PerCorteTable({
  perCorte,
  currency,
  rate,
}: {
  perCorte: CorteProductRecord[];
  currency: "USD" | "CUP";
  rate: number | null;
}) {
  const columns: DataTableColumn<CorteProductRecord>[] = [
    { key: "corteIndex", label: "Corte", type: "number", value: (c) => c.corteIndex, render: (c) => `C${c.corteIndex}` },
    {
      key: "initialStock",
      label: "Inicial",
      type: "number",
      value: (c) => c.initialStock,
      render: (c) => fmtQty(c.initialStock),
    },
    {
      key: "soldQty",
      label: "Vendido",
      type: "number",
      value: (c) => c.soldQty,
      render: (c) => fmtQty(c.soldQty),
    },
    {
      key: "remaining",
      label: "Restante",
      type: "number",
      value: (c) => c.remaining,
      render: (c) => fmtQty(c.remaining),
    },
    {
      key: "revenue",
      label: "Ingreso",
      type: "number",
      value: (c) => c.revenue,
      render: (c) => money(c.revenue, currency, rate),
    },
    {
      key: "profit",
      label: "Ganancia",
      type: "number",
      value: (c) => c.profit,
      render: (c) => money(c.profit, currency, rate),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={perCorte}
      rowKey={(c) => c.corteId}
      defaultSortKey="corteIndex"
      defaultSortDir={1}
      emptyMessage="Sin cortes en el rango seleccionado."
    />
  );
}
