import { useAppStore } from "../store/appStore.js";
import { useAnalytics } from "../AnalyticsContext.js";
import { fmtDate } from "../lib/format.js";

export function FilterBar() {
  const snapshot = useAppStore((s) => s.snapshot);
  const currentLocationId = useAppStore((s) => s.currentLocationId);
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const analytics = useAnalytics();

  const location = snapshot?.locations.find((l) => l.id === currentLocationId);
  if (!location) return null;

  const selectedCortes = new Set(filters.cortes ?? []);
  const allSelected = selectedCortes.size === 0;

  function toggleCorte(id: number) {
    const current = new Set(filters.cortes ?? []);
    if (current.has(id)) current.delete(id);
    else current.add(id);
    const next = current.size === location!.cortes.length || current.size === 0
      ? undefined
      : [...current];
    setFilters({ ...filters, cortes: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Desde</label>
        <input
          type="date"
          className="input"
          value={filters.from ?? ""}
          onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })}
        />
        <label className="text-xs text-slate-500">Hasta</label>
        <input
          type="date"
          className="input"
          value={filters.to ?? ""}
          onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {location.cortes.map((c) => {
          const active = allSelected || selectedCortes.has(c.id);
          return (
            <button
              key={c.id}
              className={active ? "tab-active" : "tab"}
              onClick={() => toggleCorte(c.id)}
              title={`${fmtDate(c.startDate)} – ${fmtDate(c.endDate)}`}
            >
              C{c.id} · {fmtDate(c.startDate)}–{fmtDate(c.endDate)}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
        {analytics && (
          <span>
            {analytics.totals.cortes} cortes · {analytics.totals.productsTracked} productos
          </span>
        )}
        <button
          className="btn-secondary"
          onClick={() => setFilters({})}
          disabled={!filters.from && !filters.to && !filters.cortes}
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
