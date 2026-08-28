import { useState } from "react";
import { useAppStore } from "../store/appStore.js";
import { useAnalytics } from "../AnalyticsContext.js";
import { fmtDate } from "../lib/format.js";

export function FilterBar() {
  const snapshot = useAppStore((s) => s.snapshot);
  const currentLocationId = useAppStore((s) => s.currentLocationId);
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const analytics = useAnalytics();

  const hasCorteFilter = Boolean(filters.cortes && filters.cortes.length > 0);
  // Colapsado por defecto; si ya había una selección de cortes específicos activa, se muestra
  // abierto para que no quede "escondida" la razón de que los totales no incluyan todos los cortes.
  const [showCortes, setShowCortes] = useState(hasCorteFilter);

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
    <div className="flex flex-col gap-2 border-b border-slate-800 bg-slate-950/80 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
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

        <div className="flex items-center gap-3 text-xs text-slate-500 sm:ml-auto">
          {analytics && (
            <span className="whitespace-nowrap">
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

      <div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200"
          onClick={() => setShowCortes((v) => !v)}
          aria-expanded={showCortes}
          aria-controls="corte-selector"
        >
          <span
            className={`inline-block transition-transform ${showCortes ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            ▸
          </span>
          {showCortes ? "Ocultar cortes específicos" : "Abrir para seleccionar cortes específicos"}
          {!allSelected && (
            <span className="badge bg-emerald-900 text-emerald-300">
              {selectedCortes.size} seleccionado{selectedCortes.size === 1 ? "" : "s"}
            </span>
          )}
        </button>

        {showCortes && (
          <div id="corte-selector" className="mt-2 flex flex-wrap items-center gap-1">
            {location.cortes.map((c) => {
              const active = allSelected || selectedCortes.has(c.id);
              return (
                <button
                  key={c.id}
                  className={active ? "tab-active" : "tab"}
                  onClick={() => toggleCorte(c.id)}
                  title={`${fmtDate(c.startDate)} – ${fmtDate(c.endDate)}`}
                >
                  C{c.index} · {fmtDate(c.startDate)}–{fmtDate(c.endDate)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
