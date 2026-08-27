import { useRef, useState } from "react";
import { parseWorkbook, InventoryParseError } from "@inventory/core";
import { useAppStore } from "../store/appStore.js";
import { saveSnapshot } from "../lib/persistence.js";
import { fmtDate } from "../lib/format.js";
import { Card } from "../components/ui.js";

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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-10">
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
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Archivo</dt>
              <dd className="text-slate-200">{snapshot.fileName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Cortes</dt>
              <dd className="text-slate-200">{snapshot.cortes.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Productos</dt>
              <dd className="text-slate-200">
                {new Set(snapshot.cortes.flatMap((c) => c.lines.map((l) => l.product))).size}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Compras</dt>
              <dd className="text-slate-200">{snapshot.purchases.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Rango</dt>
              <dd className="text-slate-200">
                {snapshot.cortes.length > 0
                  ? `${fmtDate(snapshot.cortes[0].startDate)} – ${fmtDate(
                      snapshot.cortes[snapshot.cortes.length - 1].endDate,
                    )}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Importado</dt>
              <dd className="text-slate-200">
                {new Date(snapshot.importedAt).toLocaleString("es-CU")}
              </dd>
            </div>
          </dl>

          {snapshot.resumen.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                Resumen (CUP)
              </h3>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-1">Corte</th>
                    <th className="py-1">Ventas</th>
                    <th className="py-1">Ganancia Adrian</th>
                    <th className="py-1">Ganancia Alejandro</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.resumen.map((r) => (
                    <tr key={r.corte} className="border-t border-slate-800">
                      <td className="py-1 text-slate-300">{r.corte}</td>
                      <td className="py-1 text-slate-300">{r.totalSales ?? "—"}</td>
                      <td className="py-1 text-slate-300">{r.profitAdrian ?? "—"}</td>
                      <td className="py-1 text-slate-300">{r.profitAlejandro ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {snapshot.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-3">
              <h3 className="mb-1 text-xs uppercase tracking-wide text-amber-400">
                Avisos
              </h3>
              <ul className="list-inside list-disc text-sm text-amber-200">
                {snapshot.warnings.map((w, i) => (
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
