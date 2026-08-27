import type { ReactNode } from "react";
import type { Quadrant } from "@inventory/core";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-xs uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="truncate text-xl font-semibold text-slate-50 sm:text-2xl">
        {value}
      </span>
      {hint && <span className="truncate text-xs text-slate-500">{hint}</span>}
    </Card>
  );
}

const BADGE_COLORS: Record<string, string> = {
  slate: "bg-slate-700 text-slate-200",
  emerald: "bg-emerald-900 text-emerald-300",
  sky: "bg-sky-900 text-sky-300",
  violet: "bg-violet-900 text-violet-300",
  rose: "bg-rose-900 text-rose-300",
  amber: "bg-amber-900 text-amber-300",
};

export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: keyof typeof BADGE_COLORS;
}) {
  return <span className={`badge ${BADGE_COLORS[color]}`}>{children}</span>;
}

export function ScoreBar({ value }: { value: number | null }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-24 rounded-full bg-slate-800">
      <div
        className="h-2 rounded-full bg-emerald-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
      <h3 className="text-lg font-medium text-slate-200">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate-400">{description}</p>}
      {action}
    </div>
  );
}

const QUADRANT_LABELS: Record<Quadrant, string> = {
  star: "Estrella",
  volume: "Volumen",
  niche: "Nicho rentable",
  "phase-out": "Descontinuar",
  "no-sales": "Sin ventas",
};

const QUADRANT_COLORS: Record<Quadrant, keyof typeof BADGE_COLORS> = {
  star: "emerald",
  volume: "sky",
  niche: "violet",
  "phase-out": "rose",
  "no-sales": "slate",
};

export function QuadrantBadge({ quadrant }: { quadrant: Quadrant }) {
  return <Badge color={QUADRANT_COLORS[quadrant]}>{QUADRANT_LABELS[quadrant]}</Badge>;
}
