/** Utilidades de normalización y conversión de celdas de Excel */

export function norm(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Convierte un valor de celda a número; devuelve null si no es numérico */
export function toNum(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    let s = value.trim();
    if (!s || s.startsWith("#")) return null; // #DIV/0!, #REF!, ...
    s = s.replace(/[$₱\s]/g, "");
    // formato es: 1.234,56
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (/^-?\d+(,\d+)?$/.test(s) && s.includes(",")) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fecha local de un Date en formato ISO yyyy-mm-dd (sin desfase de zona) */
function dateToISO(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Convierte Date o string de fecha a ISO yyyy-mm-dd; null si inválida */
export function toISODate(value: unknown): string | null {
  if (value instanceof Date) return dateToISO(value);
  if (typeof value === "string") {
    const s = value.trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
    m = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/.exec(s);
    if (m) {
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      return `${y}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
    }
  }
  return null;
}

export function diffDays(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00`);
  const b = Date.parse(`${toISO}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export interface CorteTitleInfo {
  index: number;
  exchangeRate: number | null;
  startDate: string;
  /** null si el título solo trae una fecha (ej. algunos locales titulan "Corte N (tasa) fecha",
   *  sin rango) — se completa después comparando con el corte siguiente. */
  endDate: string | null;
}

/**
 * Parsea un título de corte, p.ej. "Corte 2 (515) 30/03/26 - 2/04/26", o variantes de un solo
 * local con una sola fecha, p.ej. "Corte 1(523) 14/04/26".
 * Devuelve null si no es un título de corte o no trae ninguna fecha.
 */
export function parseCorteTitle(value: unknown): CorteTitleInfo | null {
  if (typeof value !== "string") return null;
  const text = norm(value);
  const m = /^corte\s*#?\s*(\d+)\s*(?:\(([^)]*)\))?/.exec(text);
  if (!m) return null;
  const index = Number(m[1]);
  let exchangeRate: number | null = null;
  if (m[2]) {
    const rate = /^(\d+([.,]\d+)?)/.exec(m[2].trim());
    if (rate) exchangeRate = toNum(rate[1]);
  }
  const dates = [...value.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g)];
  if (dates.length < 1) return null;
  const startDate = toISODate(`${dates[0][1]}/${dates[0][2]}/${dates[0][3]}`);
  if (!startDate) return null;
  const endDate =
    dates.length >= 2 ? toISODate(`${dates[1][1]}/${dates[1][2]}/${dates[1][3]}`) : null;
  return { index, exchangeRate, startDate, endDate };
}

export function isCorteTitle(value: unknown): boolean {
  return parseCorteTitle(value) !== null;
}

/** Busca en una fila (array) la primera celda que sea título de corte */
export function findCorteTitleInRow(row: unknown[]): CorteTitleInfo | null {
  for (let c = 0; c < Math.min(row.length, 8); c++) {
    const info = parseCorteTitle(row[c]);
    if (info) return info;
  }
  return null;
}
