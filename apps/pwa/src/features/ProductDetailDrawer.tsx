import { useAnalytics } from "../AnalyticsContext.js";
import { useAppStore } from "../store/appStore.js";
import { fmtDate, fmtPct, fmtQty, money } from "../lib/format.js";
import { QuadrantBadge } from "../components/ui.js";

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
            <div className="text-slate-100">{product.unitsSold} uds</div>
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
            <div className="text-slate-100">{product.stockRemaining} uds</div>
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
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="th">Fecha</th>
                  <th className="th">Cantidad</th>
                  <th className="th">Precio</th>
                  <th className="th">Tasa</th>
                  <th className="th">Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {product.purchasePrice.history.map((h, i) => (
                  <tr key={i} className="border-b border-slate-900">
                    <td className="td">{fmtDate(h.date)}</td>
                    <td className="td">{h.quantity}</td>
                    <td className="td">{money(h.purchasePriceUSD, "USD", rate)}</td>
                    <td className="td">{h.exchangeRate ?? "—"}</td>
                    <td className="td">{h.supplier ?? "—"}</td>
                  </tr>
                ))}
                {product.purchasePrice.history.length === 0 && (
                  <tr>
                    <td className="td text-slate-500" colSpan={5}>
                      Sin compras registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-300">Evolución por corte</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="th">Corte</th>
                  <th className="th">Inicial</th>
                  <th className="th">Vendido</th>
                  <th className="th">Restante</th>
                  <th className="th">Ingreso</th>
                  <th className="th">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {product.perCorte.map((c) => (
                  <tr key={c.corte} className="border-b border-slate-900">
                    <td className="td">C{c.corte}</td>
                    <td className="td">{c.initialStock}</td>
                    <td className="td">{c.soldQty}</td>
                    <td className="td">{c.remaining}</td>
                    <td className="td">{money(c.revenue, currency, rate)}</td>
                    <td className="td">{money(c.profit, currency, rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
