import { useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ColumnType = "text" | "number" | "select";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  /** Tipo de columna: determina el control de filtro y la comparación al ordenar. Default "text". */
  type?: ColumnType;
  /** Valor comparable (para ordenar y para el filtro por defecto). */
  value: (row: T) => string | number | null;
  /** Contenido de la celda; si se omite, se muestra `value(row)`. */
  render?: (row: T) => ReactNode;
  /** Opciones fijas para columnas "select"; si se omite, se calculan a partir de los datos. */
  options?: string[];
  /** Traduce un valor crudo de "select" a la etiqueta a mostrar en el desplegable. */
  optionLabel?: (raw: string) => string;
  sortable?: boolean;
  filterable?: boolean;
  align?: "left" | "right";
}

interface NumberRange {
  min: string;
  max: string;
}

/**
 * Tabla genérica con orden y filtro por cualquier columna (clic en el header para ordenar,
 * fila de controles debajo del header para filtrar: texto libre, rango numérico o selección).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  defaultSortKey,
  defaultSortDir = -1,
  emptyMessage = "Sin datos.",
  minWidthClassName,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  defaultSortKey?: string;
  defaultSortDir?: 1 | -1;
  emptyMessage?: string;
  minWidthClassName?: string;
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<1 | -1>(defaultSortDir);
  const [textFilters, setTextFilters] = useState<Record<string, string>>({});
  const [selectFilters, setSelectFilters] = useState<Record<string, string>>({});
  const [rangeFilters, setRangeFilters] = useState<Record<string, NumberRange>>({});

  function toggleSort(key: string) {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  const selectOptionsByColumn = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const c of columns) {
      if (c.type === "select" && !c.options) {
        const set = new Set<string>();
        for (const r of rows) {
          const v = c.value(r);
          if (v != null) set.add(String(v));
        }
        map[c.key] = [...set].sort();
      }
    }
    return map;
  }, [columns, rows]);

  const hasActiveFilters =
    Object.values(textFilters).some(Boolean) ||
    Object.values(selectFilters).some(Boolean) ||
    Object.values(rangeFilters).some((r) => r.min !== "" || r.max !== "");

  function clearFilters() {
    setTextFilters({});
    setSelectFilters({});
    setRangeFilters({});
  }

  const processed = useMemo(() => {
    let out = rows.filter((row) =>
      columns.every((c) => {
        if (c.filterable === false) return true;
        const raw = c.value(row);
        if (c.type === "number") {
          const range = rangeFilters[c.key];
          if (!range || (range.min === "" && range.max === "")) return true;
          const n = typeof raw === "number" ? raw : null;
          if (n == null) return false;
          if (range.min !== "" && n < Number(range.min)) return false;
          if (range.max !== "" && n > Number(range.max)) return false;
          return true;
        }
        if (c.type === "select") {
          const sel = selectFilters[c.key];
          if (!sel) return true;
          return String(raw ?? "") === sel;
        }
        const q = textFilters[c.key];
        if (!q) return true;
        return String(raw ?? "")
          .toLowerCase()
          .includes(q.toLowerCase());
      }),
    );

    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        out = [...out].sort((a, b) => {
          const av = col.value(a);
          const bv = col.value(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1; // los sin dato siempre al final
          if (bv == null) return -1;
          if (av < bv) return -1 * sortDir;
          if (av > bv) return 1 * sortDir;
          return 0;
        });
      }
    }

    return out;
  }, [rows, columns, textFilters, selectFilters, rangeFilters, sortKey, sortDir]);

  return (
    <div className="flex flex-col gap-2">
      {hasActiveFilters && (
        <button
          type="button"
          className="self-start text-xs font-medium text-emerald-400 hover:text-emerald-300"
          onClick={clearFilters}
        >
          Limpiar filtros de la tabla
        </button>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className={`w-full border-collapse text-sm ${minWidthClassName ?? ""}`}>
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`th ${c.align === "right" ? "text-right" : ""}`}
                  onClick={c.sortable === false ? undefined : () => toggleSort(c.key)}
                >
                  {c.label} {sortKey === c.key ? (sortDir === 1 ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-800 bg-slate-950/40">
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-1.5 text-left font-normal">
                  {c.filterable === false ? null : c.type === "number" ? (
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="min"
                        className="input w-14 px-1.5 py-1 text-xs"
                        value={rangeFilters[c.key]?.min ?? ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setRangeFilters((f) => ({
                            ...f,
                            [c.key]: { min: e.target.value, max: f[c.key]?.max ?? "" },
                          }))
                        }
                      />
                      <input
                        type="number"
                        placeholder="max"
                        className="input w-14 px-1.5 py-1 text-xs"
                        value={rangeFilters[c.key]?.max ?? ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setRangeFilters((f) => ({
                            ...f,
                            [c.key]: { min: f[c.key]?.min ?? "", max: e.target.value },
                          }))
                        }
                      />
                    </div>
                  ) : c.type === "select" ? (
                    <select
                      className="input w-full px-1.5 py-1 text-xs"
                      value={selectFilters[c.key] ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setSelectFilters((f) => ({ ...f, [c.key]: e.target.value }))
                      }
                    >
                      <option value="">Todos</option>
                      {(c.options ?? selectOptionsByColumn[c.key] ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {c.optionLabel ? c.optionLabel(opt) : opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Filtrar…"
                      className="input w-full px-1.5 py-1 text-xs"
                      value={textFilters[c.key] ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setTextFilters((f) => ({ ...f, [c.key]: e.target.value }))
                      }
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={
                  onRowClick
                    ? "cursor-pointer border-b border-slate-900 hover:bg-slate-800/40"
                    : "border-b border-slate-900"
                }
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`td ${c.align === "right" ? "text-right" : ""}`}>
                    {c.render ? c.render(row) : (c.value(row) ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {processed.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={columns.length}>
                  {rows.length === 0 ? emptyMessage : "Sin resultados para estos filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
