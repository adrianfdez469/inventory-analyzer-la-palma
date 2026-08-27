import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ResponsiveContainer } from "recharts";
import type { ProductAnalytics } from "@inventory/core";
import { useAnalytics } from "../AnalyticsContext.js";
import { useAppStore } from "../store/appStore.js";
import { money, fmtQty, fmtPct } from "../lib/format.js";
import { Card, EmptyState, QuadrantBadge, ScoreBar } from "../components/ui.js";

type Tab = "mostSold" | "leastSold" | "juiciest";

const TABS: { key: Tab; label: string }[] = [
  { key: "mostSold", label: "Más vendidos" },
  { key: "leastSold", label: "Menos vendidos" },
  { key: "juiciest", label: "Más jugosos" },
];

const QUADRANT_FILL: Record<string, string> = {
  star: "#22c55e",
  volume: "#38bdf8",
  niche: "#a78bfa",
  "phase-out": "#fb7185",
  "no-sales": "#64748b",
};

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ProductAnalytics }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <div className="font-medium">{p.product}</div>
      <div>{fmtQty(p.unitsPerDay)} uds/día</div>
      <div>{fmtPct(p.marginPct)} margen</div>
    </div>
  );
}

export function RankingsPage() {
  const analytics = useAnalytics();
  const currency = useAppStore((s) => s.currency);
  const setDetailProduct = useAppStore((s) => s.setDetailProduct);
  const [tab, setTab] = useState<Tab>("mostSold");

  if (!analytics) {
    return <EmptyState title="No hay datos" description="Importa un Excel primero." />;
  }

  const rate = analytics.displayRate;
  const list = analytics.rankings[tab].slice(0, 20);
  const scatterData = analytics.products.filter((p) => p.unitsSold > 0);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab-active" : "tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="th">#</th>
              <th className="th">Producto</th>
              <th className="th">Vendidos</th>
              <th className="th">Ganancia/día</th>
              <th className="th">Score</th>
              <th className="th">Cuadrante</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p, i) => (
              <tr
                key={p.product}
                className="cursor-pointer border-b border-slate-900 hover:bg-slate-800/40"
                onClick={() => setDetailProduct(p.product)}
              >
                <td className="td text-slate-500">{i + 1}</td>
                <td className="td font-medium text-slate-100">{p.product}</td>
                <td className="td">{p.unitsSold}</td>
                <td className="td">{money(p.profitPerDay, currency, rate)}</td>
                <td className="td">
                  <ScoreBar value={p.juicinessScore} />
                </td>
                <td className="td">
                  <QuadrantBadge quadrant={p.quadrant} />
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={6}>
                  Sin datos para este ranking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-medium text-slate-300">
          Margen % vs. unidades/día
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Estrella (rápido + rentable) · Volumen (rápido, bajo margen) · Nicho rentable
          (lento, alto margen) · Descontinuar (lento, bajo margen)
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="unitsPerDay"
              name="uds/día"
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis
              type="number"
              dataKey="marginPct"
              name="margen %"
              stroke="#64748b"
              fontSize={12}
            />
            <ZAxis range={[60, 60]} />
            <ReferenceLine
              x={analytics.medians.unitsPerDay}
              stroke="#475569"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={analytics.medians.marginPct}
              stroke="#475569"
              strokeDasharray="4 4"
            />
            <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={scatterData}>
              {scatterData.map((p) => (
                <Cell key={p.product} fill={QUADRANT_FILL[p.quadrant]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
