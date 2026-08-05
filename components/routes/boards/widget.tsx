"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { WidgetBodySkeleton } from "@/components/routes/skeletons";

/**
 * Fixed categorical order (dataviz skill default palette, dark-mode steps) — validated via
 * scripts/validate_palette.js against this app's actual dark card surface (#241e1a): all checks
 * pass (lightness band, chroma floor, CVD separation, normal-vision floor, contrast). Assigned by
 * series/slice index in this order, never cycled or reordered when the series count changes.
 */
const SERIES_COLORS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];
const SINGLE_SERIES_COLOR = SERIES_COLORS[0];
const MUTED_INK = "#898781";
const GRIDLINE = "#2c2c2a";
const TOOLTIP_STYLE = { background: "#1a1a19", border: "1px solid #2c2c2a", borderRadius: 6, fontSize: 12 };

/** Merges independent per-series point lists onto a shared bucket axis (union of buckets,
 *  zero-filling gaps) — needed for grouped bar/multi-line/table rendering of `compare` widgets. */
function mergeSeriesToRows(series: Boards.SeriesResult[]): Record<string, string | number>[] {
  const bucketOrder: string[] = [];
  const seen = new Set<string>();
  for (const s of series) {
    for (const p of s.points) {
      if (!seen.has(p.bucket)) {
        seen.add(p.bucket);
        bucketOrder.push(p.bucket);
      }
    }
  }
  return bucketOrder.map((bucket) => {
    const row: Record<string, string | number> = { bucket };
    for (const s of series) {
      row[s.label] = s.points.find((p) => p.bucket === bucket)?.value ?? 0;
    }
    return row;
  });
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function Widget({ config }: { config: Boards.WidgetConfig }) {
  const [data, setData] = useState<Boards.WidgetDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch("/api/acaraje/boards/widget-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metric: config.metric }),
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load widget");
        setData(json);
      })
      .catch((err) => setError(err.message));
  }, [config.metric]);

  return (
    <Card className="p-5 space-y-3">
      <h3 className="text-sm font-semibold truncate">{config.title}</h3>

      {error ? (
        <div className="h-40 flex items-center justify-center text-xs text-red-400 text-center px-4">{error}</div>
      ) : !data ? (
        <WidgetBodySkeleton />
      ) : (
        <WidgetChart data={data} />
      )}

      {data?.meta?.note && <p className="text-[10px] text-muted-foreground/60">{data.meta.note}</p>}
    </Card>
  );
}

export function WidgetChart({ data }: { data: Boards.WidgetDataResponse }) {
  const { chartType, series } = data;
  const isMultiSeries = series.length > 1;

  if (chartType === "stat") {
    const value = series[0]?.points[0]?.value ?? 0;
    const extra = (series[0]?.points.length ?? 0) - 1;
    return (
      <div className="h-40 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono text-primary-foreground">{formatValue(value)}</span>
        {extra > 0 && <span className="text-[10px] text-muted-foreground mt-1">+{extra} more</span>}
      </div>
    );
  }

  if (chartType === "table") {
    const rows = mergeSeriesToRows(series);
    return (
      <div className="h-40 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/40">
              <th className="py-1 pr-2 font-medium">Bucket</th>
              {series.map((s, i) => (
                <th
                  key={s.label}
                  className="py-1 px-2 font-medium"
                  style={{ color: isMultiSeries ? SERIES_COLORS[i % SERIES_COLORS.length] : undefined }}
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.bucket)} className="border-b border-border/20 last:border-0">
                <td className="py-1 pr-2 text-foreground truncate max-w-[10rem]">{row.bucket}</td>
                {series.map((s) => (
                  <td key={s.label} className="py-1 px-2 font-mono text-muted-foreground">
                    {formatValue(Number(row[s.label] ?? 0))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === "pie") {
    const points = series[0]?.points ?? [];
    return (
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={points} dataKey="value" nameKey="bucket" innerRadius={30} outerRadius={55} paddingAngle={2}>
              {points.map((_, i) => (
                <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#ffffff" }} />
            {points.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: MUTED_INK }} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const rows = mergeSeriesToRows(series);

  if (chartType === "bar") {
    return (
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRIDLINE} vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: MUTED_INK }} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: MUTED_INK }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {isMultiSeries && <Legend wrapperStyle={{ fontSize: 11, color: MUTED_INK }} />}
            {series.map((s, i) => (
              <Bar
                key={s.label}
                dataKey={s.label}
                fill={isMultiSeries ? SERIES_COLORS[i % SERIES_COLORS.length] : SINGLE_SERIES_COLOR}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRIDLINE} vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: MUTED_INK }} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: MUTED_INK }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {isMultiSeries && <Legend wrapperStyle={{ fontSize: 11, color: MUTED_INK }} />}
          {series.map((s, i) => (
            <Line
              key={s.label}
              type="monotone"
              dataKey={s.label}
              stroke={isMultiSeries ? SERIES_COLORS[i % SERIES_COLORS.length] : SINGLE_SERIES_COLOR}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
