import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalytics } from "../AnalyticsContext.js";
import { useAppStore } from "../store/appStore.js";
import { money } from "../lib/format.js";
import { Card, EmptyState, KpiCard } from "../components/ui.js";

const CHART_GREEN = "#22c55e";
const AXIS_COLOR = "#64748b";
const GRID_COLOR = "#1e293b";

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <div className="text-slate-400">{label}</div>
      <div className="font-medium">{formatter(payload[0].value)}</div>
    </div>
  );
}

export function DashboardPage() {
  const analytics = useAnalytics();
  const currency = useAppStore((s) => s.currency);

  if (!analytics) {
    return <EmptyState title="No hay datos" description="Importa un Excel primero." />;
  }

  const rate = analytics.displayRate;
  const { totals } = analytics;

  const corteData = analytics.corteAggregates.map((c) => ({
    name: `C${c.index}`,
    profit: c.profit,
    units: c.unitsSold,
  }));

  const topProfit = [...analytics.products]
    .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
    .slice(0, 8)
    .map((p) => ({ name: p.product, profit: p.profit ?? 0 }))
    .reverse();

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Ganancia" value={money(totals.profit, currency, rate)} />
        <KpiCard label="Ventas" value={money(totals.revenue, currency, rate)} />
        <KpiCard label="Unidades vendidas" value={String(totals.unitsSold)} />
        <KpiCard
          label="Ganancia / día"
          value={money(totals.profitPerDay, currency, rate)}
        />
        <KpiCard
          label="Valor stock (costo)"
          value={money(totals.stockValueAtCost, currency, rate)}
        />
        <KpiCard
          label="Inversión período"
          value={money(totals.investmentInRange, currency, rate)}
        />
      </div>

      {analytics.warnings.length > 0 && (
        <Card className="border-amber-800 bg-amber-950/30 text-amber-200">
          <ul className="list-inside list-disc text-sm">
            {analytics.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-300">Ganancia por corte</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={corteData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="name" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => money(v, currency, rate)} />}
              />
              <Bar dataKey="profit" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-300">Unidades por corte</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={corteData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="name" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => `${v} uds`} />}
              />
              <Bar dataKey="units" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-300">
          Top 8 productos por ganancia
        </h3>
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            <ResponsiveContainer width="100%" height={Math.max(220, topProfit.length * 32)}>
              <BarChart data={topProfit} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                <XAxis type="number" stroke={AXIS_COLOR} fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={AXIS_COLOR}
                  fontSize={12}
                  width={140}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => money(v, currency, rate)} />}
                />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                  {topProfit.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_GREEN}
                      fillOpacity={0.5 + (0.5 * i) / topProfit.length}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Top 5 más jugosos</h3>
        <ol className="flex flex-col gap-2">
          {analytics.rankings.juiciest.slice(0, 5).map((p, i) => (
            <li
              key={p.product}
              className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm"
            >
              <span className="text-slate-200">
                {i + 1}. {p.product}
              </span>
              <span className="text-emerald-400">
                {money(p.profitPerDay, currency, rate)}/día
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
