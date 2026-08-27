import type { Currency } from "@inventory/core";

const usdFormatter = new Intl.NumberFormat("es-CU", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const cupFormatter = new Intl.NumberFormat("es-CU", {
  maximumFractionDigits: 2,
});

const qtyFormatter = new Intl.NumberFormat("es-CU", { maximumFractionDigits: 1 });
const pctFormatter = new Intl.NumberFormat("es-CU", { maximumFractionDigits: 1 });

export function fmtUSD(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return usdFormatter.format(value);
}

export function fmtCUP(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${cupFormatter.format(value)} CUP`;
}

export function fmtQty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return qtyFormatter.format(value);
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${pctFormatter.format(value)}%`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-CU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Convierte un monto en USD a la moneda de despliegue elegida */
export function money(
  usdValue: number | null | undefined,
  currency: Currency,
  rate: number | null,
): string {
  if (usdValue == null || !Number.isFinite(usdValue)) return "—";
  if (currency === "USD" || rate == null) return fmtUSD(usdValue);
  return fmtCUP(usdValue * rate);
}
