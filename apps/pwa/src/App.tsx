import { useEffect } from "react";
import { AnalyticsProvider, useAnalytics } from "./AnalyticsContext.js";
import { useAppStore, type Page } from "./store/appStore.js";
import { loadSnapshot } from "./lib/persistence.js";
import { ImportPage } from "./features/ImportPage.js";
import { FilterBar } from "./features/FilterBar.js";
import { DashboardPage } from "./features/DashboardPage.js";
import { RankingsPage } from "./features/RankingsPage.js";
import { ProductsPage } from "./features/ProductsPage.js";
import { RestockPage } from "./features/RestockPage.js";
import { ProductDetailDrawer } from "./features/ProductDetailDrawer.js";

const NAV: { key: Page; label: string }[] = [
  { key: "import", label: "Importar" },
  { key: "dashboard", label: "Dashboard" },
  { key: "ranking", label: "Rankings" },
  { key: "products", label: "Productos" },
  { key: "restock", label: "Reponer" },
];

function Header() {
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const snapshot = useAppStore((s) => s.snapshot);
  const currency = useAppStore((s) => s.currency);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const analytics = useAnalytics();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
      <span className="whitespace-nowrap text-sm font-semibold text-slate-100">
        Ferretería La Palma <span className="text-emerald-400">· Inventory</span>
      </span>
      <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-none sm:w-auto sm:overflow-visible sm:px-0">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`shrink-0 ${page === n.key ? "tab-active" : "tab"}`}
            onClick={() => setPage(n.key)}
            disabled={n.key !== "import" && !snapshot}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <button
          className="btn-secondary"
          disabled={!analytics?.displayRate}
          onClick={() => setCurrency(currency === "USD" ? "CUP" : "USD")}
          title={
            analytics?.displayRate
              ? `Tasa: ${analytics.displayRate}`
              : "Sin tasa de cambio disponible"
          }
        >
          {currency}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  const snapshot = useAppStore((s) => s.snapshot);
  const setPage = useAppStore((s) => s.setPage);

  if (!snapshot) return null;

  return (
    <footer className="flex items-center justify-between border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
      <span>
        {snapshot.fileName} · importado{" "}
        {new Date(snapshot.importedAt).toLocaleDateString("es-CU")}
      </span>
      <button className="text-emerald-400 hover:underline" onClick={() => setPage("import")}>
        Cambiar Excel
      </button>
    </footer>
  );
}

function Pages() {
  const page = useAppStore((s) => s.page);
  switch (page) {
    case "import":
      return <ImportPage />;
    case "dashboard":
      return <DashboardPage />;
    case "ranking":
      return <RankingsPage />;
    case "products":
      return <ProductsPage />;
    case "restock":
      return <RestockPage />;
    default:
      return null;
  }
}

function Shell() {
  const page = useAppStore((s) => s.page);
  const snapshot = useAppStore((s) => s.snapshot);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {snapshot && page !== "import" && <FilterBar />}
      <main className="flex-1">
        <Pages />
      </main>
      <Footer />
      <ProductDetailDrawer />
    </div>
  );
}

export function App() {
  const setSnapshot = useAppStore((s) => s.setSnapshot);
  const setPage = useAppStore((s) => s.setPage);

  useEffect(() => {
    let cancelled = false;
    loadSnapshot().then((snapshot) => {
      if (cancelled || !snapshot) return;
      setSnapshot(snapshot);
      setPage("dashboard");
    });
    return () => {
      cancelled = true;
    };
  }, [setSnapshot, setPage]);

  return (
    <AnalyticsProvider>
      <Shell />
    </AnalyticsProvider>
  );
}
