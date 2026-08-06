"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { WidgetBodySkeleton } from "@/components/routes/skeletons";
import { normalizeWidgetSize } from "@/lib/boards-layout";

const SERIES_COLORS = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];
const MUTED_INK = "#898781";
const GRIDLINE = "#2c2c2a";
const TOOLTIP_STYLE = { background: "#1a1a19", border: "1px solid #2c2c2a", borderRadius: 6, fontSize: 12 };

function seriesColor(index: number, display?: Boards.WidgetDisplay): string {
  if (display?.colors?.[index]) return display.colors[index];
  if (index === 0 && display?.color) return display.color;
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function displaySeriesLabel(label: string, display?: Boards.WidgetDisplay): string {
  return display?.seriesLabels?.[label] ?? label;
}

function mergeSeriesToRows(series: Boards.SeriesResult[], display?: Boards.WidgetDisplay): Record<string, string | number>[] {
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
      const key = displaySeriesLabel(s.label, display);
      row[key] = s.points.find((p) => p.bucket === bucket)?.value ?? 0;
    }
    return row;
  });
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const axisLabelProps = {
  fill: MUTED_INK,
  fontSize: 10,
};

export function Widget({ config }: { config: Boards.WidgetConfig }) {
  const [data, setData] = useState<Boards.WidgetDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const size = normalizeWidgetSize(config.metric.chartType, config.size);

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
    <Card className={cn("p-5 flex flex-col h-full min-h-0 space-y-2", size === "1x1" && "p-4")}>
      <div className="shrink-0 space-y-0.5">
        <h3 className="text-sm font-semibold truncate">{config.title}</h3>
        {config.display?.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{config.display.subtitle}</p>
        )}
      </div>

      <div className="flex-1 min-h-[6rem]">
        {error ? (
          <div className="h-full min-h-[6rem] flex items-center justify-center text-xs text-red-400 text-center px-4">
            {error}
          </div>
        ) : !data ? (
          <WidgetBodySkeleton className="h-full min-h-[6rem]" />
        ) : (
          <WidgetChart data={data} display={config.display} size={size} />
        )}
      </div>

      {data?.meta?.note && <p className="text-[10px] text-muted-foreground/60 shrink-0">{data.meta.note}</p>}
    </Card>
  );
}

export function WidgetChart({
  data,
  display,
  size = "2x2",
}: {
  data: Boards.WidgetDataResponse;
  display?: Boards.WidgetDisplay;
  size?: Boards.WidgetSize;
}) {
  const { chartType, series } = data;
  const isMultiSeries = series.length > 1;
  const labeledSeries = series.map((s) => ({ ...s, label: displaySeriesLabel(s.label, display) }));

  if (chartType === "stat") {
    const value = series[0]?.points[0]?.value ?? 0;
    const extra = (series[0]?.points.length ?? 0) - 1;
    const valueColor = display?.color;
    return (
      <div className="h-full min-h-[5rem] flex flex-col items-center justify-center">
        <span
          className={cn("font-bold font-mono text-primary-foreground", size === "1x1" ? "text-2xl" : "text-3xl")}
          style={valueColor ? { color: valueColor } : undefined}
        >
          {formatValue(value)}
        </span>
        {extra > 0 && <span className="text-[10px] text-muted-foreground mt-1">+{extra} more</span>}
      </div>
    );
  }

  if (chartType === "table") {
    const rows = mergeSeriesToRows(labeledSeries, display);
    return (
      <div className="h-full min-h-[6rem] overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/40">
              <th className="py-1 pr-2 font-medium">Bucket</th>
              {labeledSeries.map((s, i) => (
                <th
                  key={s.label}
                  className="py-1 px-2 font-medium"
                  style={{ color: isMultiSeries ? seriesColor(i, display) : undefined }}
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
                {labeledSeries.map((s) => (
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
      <div className="h-full min-h-[6rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={points} dataKey="value" nameKey="bucket" innerRadius="35%" outerRadius="65%" paddingAngle={2}>
              {points.map((_, i) => (
                <Cell key={i} fill={seriesColor(i, display)} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#ffffff" }} />
            {points.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: MUTED_INK }} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const rows = mergeSeriesToRows(labeledSeries, display);
  const xLabel = display?.xAxisLabel
    ? { value: display.xAxisLabel, position: "insideBottom" as const, offset: -2, ...axisLabelProps }
    : undefined;
  const yLabel = display?.yAxisLabel
    ? { value: display.yAxisLabel, angle: -90, position: "insideLeft" as const, ...axisLabelProps }
    : undefined;

  if (chartType === "bar") {
    return (
      <div className="h-full min-h-[6rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: display?.yAxisLabel ? 8 : -20, bottom: display?.xAxisLabel ? 16 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRIDLINE} vertical={false} />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 10, fill: MUTED_INK }}
              axisLine={{ stroke: GRIDLINE }}
              tickLine={false}
              label={xLabel}
            />
            <YAxis
              tick={{ fontSize: 10, fill: MUTED_INK }}
              axisLine={false}
              tickLine={false}
              width={display?.yAxisLabel ? 48 : 36}
              label={yLabel}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {isMultiSeries && <Legend wrapperStyle={{ fontSize: 11, color: MUTED_INK }} />}
            {labeledSeries.map((s, i) => (
              <Bar
                key={s.label}
                dataKey={s.label}
                fill={isMultiSeries ? seriesColor(i, display) : seriesColor(0, display)}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[6rem]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: display?.yAxisLabel ? 8 : -20, bottom: display?.xAxisLabel ? 16 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRIDLINE} vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 10, fill: MUTED_INK }}
            axisLine={{ stroke: GRIDLINE }}
            tickLine={false}
            label={xLabel}
          />
          <YAxis
            tick={{ fontSize: 10, fill: MUTED_INK }}
            axisLine={false}
            tickLine={false}
            width={display?.yAxisLabel ? 48 : 36}
            label={yLabel}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {isMultiSeries && <Legend wrapperStyle={{ fontSize: 11, color: MUTED_INK }} />}
          {labeledSeries.map((s, i) => (
            <Line
              key={s.label}
              type="monotone"
              dataKey={s.label}
              stroke={isMultiSeries ? seriesColor(i, display) : seriesColor(0, display)}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
