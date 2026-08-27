import { useRef, useState } from "react";
import { parseWorkbook, InventoryParseError } from "@inventory/core";
import { useAppStore } from "../store/appStore.js";
import { saveSnapshot } from "../lib/persistence.js";
import { fmtDate } from "../lib/format.js";
import { Badge, Card } from "../components/ui.js";

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

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-500">
                  <th className="py-2 pl-3">Local</th>
                  <th className="py-2">Cortes</th>
                  <th className="py-2">Productos</th>
                  <th className="py-2">Compras</th>
                  <th className="py-2">Rango</th>
                  <th className="py-2 pr-3">Avisos</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.locations.map((loc) => {
                  const productCount = new Set(
                    loc.cortes.flatMap((c) => c.lines.map((l) => l.product)),
                  ).size;
                  return (
                    <tr key={loc.id} className="border-t border-slate-800">
                      <td className="py-2 pl-3 font-medium text-slate-100">{loc.label}</td>
                      <td className="py-2 text-slate-300">{loc.cortes.length}</td>
                      <td className="py-2 text-slate-300">{productCount}</td>
                      <td className="py-2 text-slate-300">{loc.purchases.length}</td>
                      <td className="py-2 text-slate-300">
                        {loc.cortes.length > 0
                          ? `${fmtDate(loc.cortes[0].startDate)} – ${fmtDate(
                              loc.cortes[loc.cortes.length - 1].endDate,
                            )}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {loc.warnings.length > 0 ? (
                          <Badge color="amber">{loc.warnings.length}</Badge>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
