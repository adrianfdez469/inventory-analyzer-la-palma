import { useRef, useState } from "react";
import { parseWorkbook, InventoryParseError, type LocationSnapshot } from "@inventory/core";
import { useAppStore } from "../store/appStore.js";
import { saveSnapshot } from "../lib/persistence.js";
import { fmtDate } from "../lib/format.js";
import { Badge, Card } from "../components/ui.js";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";

interface LocationRow {
  loc: LocationSnapshot;
  productCount: number;
  rangeStart: string | null;
  rangeEnd: string | null;
}

export function ImportPage() {
  const snapshot = useAppStore((s) => s.snapshot);
  const setSnapshot = useAppStore((s) => s.setSnapshot);
  const setPage = useAppStore((s) => s.setPage);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(new Uint8Array(buffer), { fileName: file.name });
      setSnapshot(parsed);
      await saveSnapshot(parsed);
    } catch (err) {
      setError(
        err instanceof InventoryParseError
          ? err.message
          : "No se pudo leer el archivo. Verifica que sea un Excel válido.",
      );
    } finally {
      setLoading(false);
    }
  }

  const allWarnings = snapshot
    ? [
        ...snapshot.warnings,
        ...snapshot.locations.flatMap((loc) => loc.warnings.map((w) => `[${loc.label}] ${w}`)),
      ]
    : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Importar inventario</h1>
        <p className="mt-1 text-sm text-slate-400">
          Selecciona el Excel de inventario de la ferretería. Todo el análisis ocurre en
          este dispositivo — el archivo no se envía a ningún servidor.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition ${
          dragOver ? "border-emerald-500 bg-emerald-950/20" : "border-slate-700"
        }`}
      >
        <span className="text-4xl">📊</span>
        <p className="text-sm text-slate-300">
          Arrastra el archivo aquí o haz clic para seleccionarlo
        </p>
        <p className="text-xs text-slate-500">Formatos .xlsx</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {loading && <p className="text-sm text-slate-400">Procesando archivo…</p>}

      {error && (
        <Card className="border-rose-800 bg-rose-950/40 text-rose-200">{error}</Card>
      )}

      {snapshot && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-100">Archivo cargado</h2>
            <button className="btn" onClick={() => setPage("dashboard")}>
              Ir al dashboard
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Archivo</dt>
              <dd className="text-slate-200">{snapshot.fileName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Locales</dt>
              <dd className="text-slate-200">{snapshot.locations.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Importado</dt>
              <dd className="text-slate-200">
                {new Date(snapshot.importedAt).toLocaleString("es-CU")}
              </dd>
            </div>
          </dl>

          <LocationsTable locations={snapshot.locations} />

          {allWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-3">
              <h3 className="mb-1 text-xs uppercase tracking-wide text-amber-400">
                Avisos ({allWarnings.length})
              </h3>
              <ul className="max-h-48 list-inside list-disc overflow-y-auto text-sm text-amber-200">
                {allWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function LocationsTable({ locations }: { locations: LocationSnapshot[] }) {
  const rows: LocationRow[] = locations.map((loc) => ({
    loc,
    productCount: new Set(loc.cortes.flatMap((c) => c.lines.map((l) => l.product))).size,
    rangeStart: loc.cortes[0]?.startDate ?? null,
    rangeEnd: loc.cortes[loc.cortes.length - 1]?.endDate ?? null,
  }));

  const columns: DataTableColumn<LocationRow>[] = [
    {
      key: "label",
      label: "Local",
      value: (r) => r.loc.label,
      render: (r) => <span className="font-medium text-slate-100">{r.loc.label}</span>,
    },
    { key: "cortes", label: "Cortes", type: "number", value: (r) => r.loc.cortes.length },
    { key: "productos", label: "Productos", type: "number", value: (r) => r.productCount },
    { key: "compras", label: "Compras", type: "number", value: (r) => r.loc.purchases.length },
    {
      key: "rango",
      label: "Rango",
      value: (r) => (r.rangeStart ? `${r.rangeStart} – ${r.rangeEnd}` : null),
      sortable: true,
      filterable: false,
      render: (r) =>
        r.rangeStart ? `${fmtDate(r.rangeStart)} – ${fmtDate(r.rangeEnd)}` : "—",
    },
    {
      key: "avisos",
      label: "Avisos",
      type: "number",
      value: (r) => r.loc.warnings.length,
      render: (r) =>
        r.loc.warnings.length > 0 ? (
          <Badge color="amber">{r.loc.warnings.length}</Badge>
        ) : (
          <span className="text-slate-500">—</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.loc.id}
      minWidthClassName="min-w-[560px]"
      emptyMessage="Sin locales."
    />
  );
}
