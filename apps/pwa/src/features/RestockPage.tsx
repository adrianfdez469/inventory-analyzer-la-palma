import { RESTOCK_COVER_DAYS } from "@inventory/core";
import { useAnalytics } from "../AnalyticsContext.js";
import { useAppStore } from "../store/appStore.js";
import { fmtQty, money } from "../lib/format.js";
import { Card, EmptyState } from "../components/ui.js";

export function RestockPage() {
  const analytics = useAnalytics();
  const currency = useAppStore((s) => s.currency);
  const setDetailProduct = useAppStore((s) => s.setDetailProduct);

  if (!analytics) {
    return <EmptyState title="No hay datos" description="Importa un Excel primero." />;
  }

  const rate = analytics.displayRate;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="text-sm text-slate-400">
        Se sugiere reponer los productos que se venden (unidades vendidas &gt; 0) y cuya{" "}
        <strong className="text-slate-200">cobertura de stock</strong> (días que dura el
        stock actual al ritmo de venta observado) es menor a{" "}
        <strong className="text-slate-200">{RESTOCK_COVER_DAYS} días</strong>. Se ordenan
        por ganancia USD/día, priorizando los productos más rentables.
      </Card>

      {analytics.restock.length === 0 ? (
        <EmptyState
          title="Nada que reponer por ahora"
          description="Ningún producto con ventas tiene una cobertura de stock crítica en el rango seleccionado."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analytics.restock.map(({ product, reason }) => (
            <Card
              key={product.product}
              className="flex cursor-pointer flex-col gap-2 hover:border-emerald-700"
            >
              <div onClick={() => setDetailProduct(product.product)}>
                <h3 className="font-medium text-slate-100">{product.product}</h3>
                <p className="text-xs text-amber-400">{reason}</p>
              </div>
              <dl className="grid grid-cols-2 gap-1 text-xs text-slate-400">
                <dt>Stock actual</dt>
                <dd className="text-right text-slate-200">
                  {fmtQty(product.stockRemaining)} uds
                </dd>
                <dt>Ritmo de venta</dt>
                <dd className="text-right text-slate-200">
                  {fmtQty(product.unitsPerDay)} uds/día
                </dd>
                <dt>Ganancia/día</dt>
                <dd className="text-right text-slate-200">
                  {money(product.profitPerDay, currency, rate)}
                </dd>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
