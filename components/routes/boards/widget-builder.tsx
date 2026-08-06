"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WidgetChart } from "@/components/routes/boards/widget";
import {
  allowedSizesForChart,
  defaultSizeForChart,
  normalizeWidgetSize,
  WIDGET_SIZE_OPTIONS,
  type WidgetSize,
} from "@/lib/boards-layout";

const CHART_TYPES: { value: Boards.ChartType; label: string }[] = [
  { value: "pie", label: "Pie" },
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "stat", label: "Stat" },
];

const AGG_OPS: Boards.AggregateOp[] = ["sum", "avg", "min", "max"];
const NUMERIC_TYPES = new Set(["Int", "BigInt", "Float", "Decimal"]);

// ---------------------------------------------------------------------------
// Field candidate helpers — each chart's pickers only ever offer fields that
// are actually valid for that slot, driven by the live schema.
// ---------------------------------------------------------------------------

/** Boolean / enum / relation-FK (non-list) fields — eligible set for equals-filters. */
function bucketFieldCandidates(model: Schema.Model, schema: Schema.SchemaData): Schema.Field[] {
  return model.fields.filter(
    (f) => f.type === "Boolean" || schema.enums.some((e) => e.name === f.type) || (f.isRelation && !f.isList),
  );
}
/** Pie and Bar X only bucket by enum-typed fields (e.g. `role`). */
function enumFieldCandidates(model: Schema.Model, schema: Schema.SchemaData): Schema.Field[] {
  return model.fields.filter((f) => !f.isList && schema.enums.some((e) => e.name === f.type));
}
function numericFieldCandidates(model: Schema.Model): Schema.Field[] {
  return model.fields.filter((f) => NUMERIC_TYPES.has(f.type) && !f.isList);
}
function dateFieldCandidates(model: Schema.Model): Schema.Field[] {
  return model.fields.filter((f) => f.type === "DateTime");
}
function toManyRelationCandidates(model: Schema.Model): Schema.Field[] {
  return model.fields.filter((f) => f.isRelation && f.isList);
}
function relatedModelName(schema: Schema.SchemaData, modelName: string, relationField: string): string | null {
  const model = schema.models.find((m) => m.name === modelName);
  return model?.fields.find((f) => f.name === relationField)?.type ?? null;
}

// ---------------------------------------------------------------------------
// Shared pickers
// ---------------------------------------------------------------------------

function ModelSelect({
  schema,
  value,
  onChange,
}: {
  schema: Schema.SchemaData;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Model..." />
      </SelectTrigger>
      <SelectContent>
        {schema.models.map((m) => (
          <SelectItem key={m.name} value={m.name}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Drop-in for FieldSelect: when the candidate list is empty, there's nothing valid to pick and no
 *  way to build a working metric — say so instead of showing an empty dropdown. */
function FieldSelect({
  value,
  onChange,
  options,
  placeholder,
  emptyMessage = "Graph not possible — no eligible field on this model",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Schema.Field[];
  placeholder: string;
  emptyMessage?: string;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-red-400">{emptyMessage}</p>;
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((f) => (
          <SelectItem key={f.name} value={f.name}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OpSelect({
  value,
  onChange,
  includeCount = false,
  includeDivide = false,
}: {
  value: string;
  onChange: (v: string) => void;
  includeCount?: boolean;
  includeDivide?: boolean;
}) {
  const ops: string[] = [...(includeCount ? ["count"] : []), ...AGG_OPS, ...(includeDivide ? ["divide"] : [])];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ops.map((op) => (
          <SelectItem key={op} value={op}>
            {op}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FilterFormState {
  field: string;
  /** Raw select value; coerced to boolean at spec-build time when the field is Boolean. */
  value: string;
}

function filterToSpec(
  filter: FilterFormState | null,
  modelName: string,
  schema: Schema.SchemaData,
): Boards.EqualsFilter | null {
  if (!filter || !filter.field || filter.value === "") return null;
  const model = schema.models.find((m) => m.name === modelName);
  const field = model?.fields.find((f) => f.name === filter.field);
  if (!field) return null;
  if (field.type === "Boolean") return { field: filter.field, value: filter.value === "true" };
  return { field: filter.field, value: filter.value };
}

/** Field-eligible-for-filter dropdown (same eligibility as Pie's bucket field) + a value input
 *  that switches on the chosen field's type: Boolean -> True/False, enum -> its values,
 *  relation-FK -> options fetched from the existing CRUD options endpoint. */
function FilterPicker({
  model,
  schema,
  value,
  onChange,
}: {
  model: Schema.Model;
  schema: Schema.SchemaData;
  value: FilterFormState | null;
  onChange: (v: FilterFormState | null) => void;
}) {
  const candidates = bucketFieldCandidates(model, schema);
  const field = candidates.find((f) => f.name === value?.field) ?? null;
  const [relationOptions, setRelationOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!field?.isRelation) {
      setRelationOptions([]);
      return;
    }
    fetch(`/api/acaraje/crud/${field.type}/options`)
      .then((r) => r.json())
      .then((d) => setRelationOptions(d.options ?? []));
  }, [field?.isRelation, field?.type]);

  if (candidates.length === 0) return null;

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Select
          value={value?.field ?? "__none"}
          onValueChange={(v) => (v === "__none" ? onChange(null) : onChange({ field: v, value: "" }))}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="No filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">No filter</SelectItem>
            {candidates.map((f) => (
              <SelectItem key={f.name} value={f.name}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {field && (
        <div className="flex-1">
          <Select value={value?.value ?? ""} onValueChange={(v) => onChange({ field: field.name, value: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Value..." />
            </SelectTrigger>
            <SelectContent>
              {field.type === "Boolean" && (
                <>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </>
              )}
              {field.isRelation &&
                relationOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              {!field.isRelation &&
                field.type !== "Boolean" &&
                schema.enums
                  .find((e) => e.name === field.type)
                  ?.values.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SimpleMetric (Model -> Op -> numeric field if op != count -> optional filter) — the one real
// point of reuse: Stat-simple, both legs of Stat-divide, Line's Y, and Bar's same-model Y.
// ---------------------------------------------------------------------------

interface SimpleFormState {
  model: string;
  op: Boards.Op;
  field: string;
  filter: FilterFormState | null;
}

function emptySimple(model = ""): SimpleFormState {
  return { model, op: "count", field: "", filter: null };
}

function specToSimpleForm(spec: Boards.SimpleMetric): SimpleFormState {
  return {
    model: spec.model,
    op: spec.op,
    field: spec.field ?? "",
    filter: spec.filter ? { field: spec.filter.field, value: String(spec.filter.value) } : null,
  };
}

function simpleToSpec(f: SimpleFormState, schema: Schema.SchemaData): Boards.SimpleMetric | null {
  if (!f.model) return null;
  if (f.op !== "count" && !f.field) return null;
  if (f.filter && !filterToSpec(f.filter, f.model, schema)) return null;
  return {
    model: f.model,
    op: f.op,
    field: f.op !== "count" ? f.field : undefined,
    filter: filterToSpec(f.filter, f.model, schema) ?? undefined,
  };
}

function SimpleMetricForm({
  schema,
  value,
  onChange,
  fixedModel,
  hideOp,
}: {
  schema: Schema.SchemaData;
  value: SimpleFormState;
  onChange: (v: SimpleFormState) => void;
  /** Model is forced (not user-selectable) — e.g. Line's Y, whose model must equal X's model. */
  fixedModel?: string;
  /** Op is chosen by a control outside this form — e.g. Stat's simple mode, where the op select
   *  doubles as the divide-mode switch. */
  hideOp?: boolean;
}) {
  const model = schema.models.find((m) => m.name === value.model) ?? null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {!fixedModel && (
          <div className="flex-1">
            <ModelSelect schema={schema} value={value.model} onChange={(v) => onChange(emptySimple(v))} />
          </div>
        )}
        {!hideOp && (
          <OpSelect
            value={value.op}
            includeCount
            onChange={(op) => onChange({ ...value, op: op as Boards.Op, field: "" })}
          />
        )}
      </div>
      {model && value.op !== "count" && (
        <FieldSelect
          value={value.field}
          onChange={(v) => onChange({ ...value, field: v })}
          options={numericFieldCandidates(model)}
          placeholder="Numeric field..."
          emptyMessage="No numeric field on this model — graph not possible"
        />
      )}
      {model && (
        <FilterPicker model={model} schema={schema} value={value.filter} onChange={(f) => onChange({ ...value, filter: f })} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pie
// ---------------------------------------------------------------------------

interface PieFormState {
  model: string;
  field: string;
}
function emptyPie(): PieFormState {
  return { model: "", field: "" };
}
function specToPieForm(spec: Boards.PieMetric): PieFormState {
  return { model: spec.model, field: spec.field };
}
function pieToSpec(f: PieFormState): Boards.PieMetric | null {
  if (!f.model || !f.field) return null;
  return { chartType: "pie", model: f.model, field: f.field };
}

function PieForm({
  schema,
  value,
  onChange,
}: {
  schema: Schema.SchemaData;
  value: PieFormState;
  onChange: (v: PieFormState) => void;
}) {
  const model = schema.models.find((m) => m.name === value.model) ?? null;
  return (
    <div className="space-y-2">
      <ModelSelect schema={schema} value={value.model} onChange={(v) => onChange({ model: v, field: "" })} />
      {model && (
        <FieldSelect
          value={value.field}
          onChange={(v) => onChange({ ...value, field: v })}
          options={enumFieldCandidates(model, schema)}
          placeholder="Enum field..."
          emptyMessage="No enum field on this model — pie chart not possible"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line
// ---------------------------------------------------------------------------

interface LineFormState {
  model: string;
  dateField: string;
  bucket: "day" | "week" | "month" | "year";
  y: SimpleFormState;
}
function emptyLine(): LineFormState {
  return { model: "", dateField: "", bucket: "day", y: emptySimple() };
}
function specToLineForm(spec: Boards.LineMetric): LineFormState {
  return { model: spec.model, dateField: spec.dateField, bucket: spec.bucket, y: specToSimpleForm(spec.y) };
}
function lineToSpec(f: LineFormState, schema: Schema.SchemaData): Boards.LineMetric | null {
  if (!f.model || !f.dateField) return null;
  const y = simpleToSpec({ ...f.y, model: f.model }, schema);
  if (!y) return null;
  return { chartType: "line", model: f.model, dateField: f.dateField, bucket: f.bucket, y };
}

function LineForm({
  schema,
  value,
  onChange,
}: {
  schema: Schema.SchemaData;
  value: LineFormState;
  onChange: (v: LineFormState) => void;
}) {
  const model = schema.models.find((m) => m.name === value.model) ?? null;
  return (
    <div className="space-y-2">
      <ModelSelect
        schema={schema}
        value={value.model}
        onChange={(v) => onChange({ model: v, dateField: "", bucket: value.bucket, y: emptySimple(v) })}
      />
      {model && (
        <div className="flex gap-2">
          <div className="flex-1">
            <FieldSelect
              value={value.dateField}
              onChange={(v) => onChange({ ...value, dateField: v })}
              options={dateFieldCandidates(model)}
              placeholder="Date field..."
            />
          </div>
          <Select value={value.bucket} onValueChange={(v) => onChange({ ...value, bucket: v as LineFormState["bucket"] })}>
            <SelectTrigger className="h-8 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {model && (
        <SimpleMetricForm
          schema={schema}
          fixedModel={value.model}
          value={{ ...value.y, model: value.model }}
          onChange={(y) => onChange({ ...value, y })}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar
// ---------------------------------------------------------------------------

interface BarFormState {
  model: string;
  field: string;
  /** "" = measure X's own model; otherwise the name of a to-many relation field on `model`. */
  via: string;
  op: Boards.Op;
  yField: string;
  filter: FilterFormState | null;
}
function emptyBar(): BarFormState {
  return { model: "", field: "", via: "", op: "count", yField: "", filter: null };
}
function specToBarForm(spec: Boards.BarMetric): BarFormState {
  return {
    model: spec.model,
    field: spec.field,
    via: spec.y.via ?? "",
    op: spec.y.op,
    yField: spec.y.field ?? "",
    filter: spec.y.filter ? { field: spec.y.filter.field, value: String(spec.y.filter.value) } : null,
  };
}
function barToSpec(f: BarFormState, schema: Schema.SchemaData): Boards.BarMetric | null {
  if (!f.model || !f.field) return null;
  if (f.op !== "count" && !f.yField) return null;
  const targetModelName = f.via ? relatedModelName(schema, f.model, f.via) : f.model;
  if (!targetModelName) return null;
  if (f.filter && !filterToSpec(f.filter, targetModelName, schema)) return null;
  return {
    chartType: "bar",
    model: f.model,
    field: f.field,
    y: {
      via: f.via || undefined,
      op: f.op,
      field: f.op !== "count" ? f.yField : undefined,
      filter: filterToSpec(f.filter, targetModelName, schema) ?? undefined,
    },
  };
}

function BarForm({
  schema,
  value,
  onChange,
}: {
  schema: Schema.SchemaData;
  value: BarFormState;
  onChange: (v: BarFormState) => void;
}) {
  const model = schema.models.find((m) => m.name === value.model) ?? null;
  const targetModelName = value.via ? relatedModelName(schema, value.model, value.via) : value.model;
  const targetModel = schema.models.find((m) => m.name === targetModelName) ?? null;

  return (
    <div className="space-y-2">
      <ModelSelect schema={schema} value={value.model} onChange={(v) => onChange({ ...emptyBar(), model: v })} />
      {model && (
        <FieldSelect
          value={value.field}
          onChange={(v) => onChange({ ...value, field: v })}
          options={enumFieldCandidates(model, schema)}
          placeholder="X field (enum)..."
          emptyMessage="No enum field on this model — graph not possible"
        />
      )}
      {model && (
        <Select
          value={value.via || "__self"}
          onValueChange={(v) => onChange({ ...value, via: v === "__self" ? "" : v, op: "count", yField: "", filter: null })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Measure..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__self">This model</SelectItem>
            {toManyRelationCandidates(model).map((f) => (
              <SelectItem key={f.name} value={f.name}>
                {f.name} ({f.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {targetModel && (
        <div className="flex gap-2">
          <OpSelect
            value={value.op}
            includeCount
            onChange={(op) => onChange({ ...value, op: op as Boards.Op, yField: "" })}
          />
          {value.op !== "count" && (
            <div className="flex-1">
              <FieldSelect
                value={value.yField}
                onChange={(v) => onChange({ ...value, yField: v })}
                options={numericFieldCandidates(targetModel)}
                placeholder="Numeric field..."
                emptyMessage="No numeric field on this model — graph not possible"
              />
            </div>
          )}
        </div>
      )}
      {targetModel && (
        <FilterPicker model={targetModel} schema={schema} value={value.filter} onChange={(f) => onChange({ ...value, filter: f })} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat
// ---------------------------------------------------------------------------

interface StatFormState {
  mode: "simple" | "divide";
  simple: SimpleFormState;
  numerator: SimpleFormState;
  denominator: SimpleFormState;
}
function emptyStat(): StatFormState {
  return { mode: "simple", simple: emptySimple(), numerator: emptySimple(), denominator: emptySimple() };
}
function specToStatForm(spec: Boards.StatMetric): StatFormState {
  if (spec.mode === "simple") {
    return { mode: "simple", simple: specToSimpleForm(spec.metric), numerator: emptySimple(), denominator: emptySimple() };
  }
  return {
    mode: "divide",
    simple: emptySimple(),
    numerator: specToSimpleForm(spec.numerator),
    denominator: specToSimpleForm(spec.denominator),
  };
}
function statToSpec(f: StatFormState, schema: Schema.SchemaData): Boards.StatMetric | null {
  if (f.mode === "simple") {
    const metric = simpleToSpec(f.simple, schema);
    return metric ? { chartType: "stat", mode: "simple", metric } : null;
  }
  const numerator = simpleToSpec(f.numerator, schema);
  const denominator = simpleToSpec(f.denominator, schema);
  return numerator && denominator ? { chartType: "stat", mode: "divide", numerator, denominator } : null;
}

function StatForm({
  schema,
  value,
  onChange,
}: {
  schema: Schema.SchemaData;
  value: StatFormState;
  onChange: (v: StatFormState) => void;
}) {
  const topValue = value.mode === "divide" ? "divide" : value.simple.op;
  return (
    <div className="space-y-2">
      <OpSelect
        value={topValue}
        includeCount
        includeDivide
        onChange={(v) =>
          v === "divide"
            ? onChange({ ...value, mode: "divide" })
            : onChange({ ...value, mode: "simple", simple: { ...value.simple, op: v as Boards.Op, field: "" } })
        }
      />
      {value.mode === "simple" ? (
        <SimpleMetricForm schema={schema} value={value.simple} onChange={(simple) => onChange({ ...value, simple })} hideOp />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Numerator</label>
            <SimpleMetricForm schema={schema} value={value.numerator} onChange={(numerator) => onChange({ ...value, numerator })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Denominator</label>
            <SimpleMetricForm
              schema={schema}
              value={value.denominator}
              onChange={(denominator) => onChange({ ...value, denominator })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock preview data — the Preview tab is for eyeballing appearance (size, colors, labels), not
// live numbers, so it never hits the network. Series labels still mirror the real widget-data
// route's labeling exactly (spec.model, or "num / denom" for a divide stat) so that seriesLabels
// overrides keyed by those labels apply the same way here as they will at runtime.
// ---------------------------------------------------------------------------

const MOCK_CURVE = [42, 27, 18, 11, 7, 4];

function mockPointsForLabels(labels: string[]): { bucket: string; value: number }[] {
  return labels.map((label, i) => ({ bucket: label, value: MOCK_CURVE[i % MOCK_CURVE.length] }));
}

/** Real enum values when the field is genuinely enum-typed (always true for Pie/Bar's X after
 *  their enum-only restriction) — falls back to placeholders only if that ever changes. */
function enumValuesFor(schema: Schema.SchemaData, modelName: string, fieldName: string): string[] {
  const field = schema.models.find((m) => m.name === modelName)?.fields.find((f) => f.name === fieldName);
  const enumDef = field && schema.enums.find((e) => e.name === field.type);
  return enumDef?.values ?? ["Category A", "Category B", "Category C"];
}

function mockLineBuckets(bucket: Boards.LineMetric["bucket"]): string[] {
  const labels: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    if (bucket === "day") d.setUTCDate(d.getUTCDate() - i);
    else if (bucket === "week") d.setUTCDate(d.getUTCDate() - i * 7);
    else if (bucket === "month") d.setUTCMonth(d.getUTCMonth() - i);
    else d.setUTCFullYear(d.getUTCFullYear() - i);
    labels.push(
      bucket === "month" ? d.toISOString().slice(0, 7) : bucket === "year" ? d.toISOString().slice(0, 4) : d.toISOString().slice(0, 10),
    );
  }
  return labels;
}

function buildMockPreview(metric: Boards.MetricSpec, schema: Schema.SchemaData): Boards.WidgetDataResponse {
  switch (metric.chartType) {
    case "pie":
      return {
        chartType: "pie",
        series: [{ label: metric.model, points: mockPointsForLabels(enumValuesFor(schema, metric.model, metric.field)) }],
      };
    case "bar":
      return {
        chartType: "bar",
        series: [{ label: metric.model, points: mockPointsForLabels(enumValuesFor(schema, metric.model, metric.field)) }],
      };
    case "line":
      return {
        chartType: "line",
        series: [{ label: metric.model, points: mockPointsForLabels(mockLineBuckets(metric.bucket)) }],
      };
    case "stat": {
      const label = metric.mode === "simple" ? metric.metric.model : `${metric.numerator.model} / ${metric.denominator.model}`;
      const value = metric.mode === "simple" ? 128 : 3.5;
      return { chartType: "stat", series: [{ label, points: [{ bucket: "total", value }] }] };
    }
  }
}

// ---------------------------------------------------------------------------
// Builder shell
// ---------------------------------------------------------------------------

export function WidgetBuilder({
  pageId,
  existing,
  schema,
  onClose,
  onSaved,
}: {
  pageId: string;
  existing?: Boards.WidgetConfig;
  schema: Schema.SchemaData;
  onClose: () => void;
  onSaved: (widget: Boards.WidgetConfig) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [chartType, setChartType] = useState<Boards.ChartType>(existing?.metric.chartType ?? "bar");
  const [size, setSize] = useState<WidgetSize>(
    normalizeWidgetSize(existing?.metric.chartType ?? "bar", existing?.size),
  );
  const [subtitle, setSubtitle] = useState(existing?.display?.subtitle ?? "");
  const [color, setColor] = useState(existing?.display?.color ?? "#3987e5");
  const [extraColors, setExtraColors] = useState((existing?.display?.colors ?? []).slice(1).join(", "));
  const [xAxisLabel, setXAxisLabel] = useState(existing?.display?.xAxisLabel ?? "");
  const [yAxisLabel, setYAxisLabel] = useState(existing?.display?.yAxisLabel ?? "");
  const [seriesLabels, setSeriesLabels] = useState<Record<string, string>>(existing?.display?.seriesLabels ?? {});
  const [pie, setPie] = useState<PieFormState>(existing?.metric.chartType === "pie" ? specToPieForm(existing.metric) : emptyPie());
  const [bar, setBar] = useState<BarFormState>(existing?.metric.chartType === "bar" ? specToBarForm(existing.metric) : emptyBar());
  const [line, setLine] = useState<LineFormState>(
    existing?.metric.chartType === "line" ? specToLineForm(existing.metric) : emptyLine(),
  );
  const [stat, setStat] = useState<StatFormState>(
    existing?.metric.chartType === "stat" ? specToStatForm(existing.metric) : emptyStat(),
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const allowed = allowedSizesForChart(chartType);
    if (!allowed.includes(size)) {
      setSize(defaultSizeForChart(chartType));
    }
  }, [chartType, size]);

  function buildDisplay(): Boards.WidgetDisplay | undefined {
    const colors = [color.trim(), ...extraColors.split(",").map((c) => c.trim())].filter(Boolean);
    const display: Boards.WidgetDisplay = {};
    if (subtitle.trim()) display.subtitle = subtitle.trim();
    if (colors[0]) display.color = colors[0];
    if (colors.length > 1) display.colors = colors;
    if (xAxisLabel.trim()) display.xAxisLabel = xAxisLabel.trim();
    if (yAxisLabel.trim()) display.yAxisLabel = yAxisLabel.trim();
    const labelEntries = Object.entries(seriesLabels).filter(([, v]) => v.trim());
    if (labelEntries.length) {
      display.seriesLabels = Object.fromEntries(labelEntries.map(([k, v]) => [k, v.trim()]));
    }
    return Object.keys(display).length ? display : undefined;
  }

  const display = buildDisplay();
  const normalizedSize = normalizeWidgetSize(chartType, size);

  function buildMetric(): Boards.MetricSpec | null {
    switch (chartType) {
      case "pie":
        return pieToSpec(pie);
      case "bar":
        return barToSpec(bar, schema);
      case "line":
        return lineToSpec(line, schema);
      case "stat":
        return statToSpec(stat, schema);
      default:
        return null;
    }
  }

  const metric = buildMetric();
  // Preview is mocked, not fetched — it's for eyeballing size/colors/labels, not live numbers.
  const mockPreview = useMemo(() => (metric ? buildMockPreview(metric, schema) : null), [JSON.stringify(metric), schema]);

  useEffect(() => {
    if (!mockPreview?.series.length) return;
    setSeriesLabels((prev) => {
      const next = { ...prev };
      for (const s of mockPreview.series) {
        if (next[s.label] === undefined) next[s.label] = prev[s.label] ?? "";
      }
      return next;
    });
  }, [mockPreview?.series.map((s) => s.label).join("|")]);

  const handleSave = async () => {
    if (!title.trim() || !metric) return;
    setSaving(true);
    setSaveError(null);
    try {
      const url = existing
        ? `/api/acaraje/boards/pages/${pageId}/widgets/${existing.id}`
        : `/api/acaraje/boards/pages/${pageId}/widgets`;
      const res = await fetch(url, {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), metric, size: normalizedSize, display }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save widget");
      onSaved(json);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const overlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">{existing ? "Edit widget" : "Add widget"}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Widget title..." className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Chart type</label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as Boards.ChartType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="data">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Metric</label>
              {chartType === "pie" && <PieForm schema={schema} value={pie} onChange={setPie} />}
              {chartType === "bar" && <BarForm schema={schema} value={bar} onChange={setBar} />}
              {chartType === "line" && <LineForm schema={schema} value={line} onChange={setLine} />}
              {chartType === "stat" && <StatForm schema={schema} value={stat} onChange={setStat} />}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card className="p-3">
                {metric && mockPreview ? (
                  <WidgetChart data={mockPreview} display={display} size={normalizedSize} />
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
                    Fill in the Data tab first
                  </div>
                )}
              </Card>
              {chartType === "line" && (
                <p className="text-[10px] text-muted-foreground/60 -mt-2">
                  Showing mock data — the real widget will show the last 5 periods
                </p>
              )}
              {chartType !== "line" && (
                <p className="text-[10px] text-muted-foreground/60 -mt-2">
                  Showing mock data to preview appearance — not the actual values
                </p>
              )}

              <div className="space-y-3 rounded-lg border border-border/40 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Appearance</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Subtitle</label>
                    <Input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Optional subtitle..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Size (4×3 grid)</label>
                    <Select
                      value={normalizedSize}
                      onValueChange={(v) => setSize(v as WidgetSize)}
                      disabled={chartType === "stat"}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WIDGET_SIZE_OPTIONS.filter((o) => allowedSizesForChart(chartType).includes(o.value)).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Primary color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={color.startsWith("#") ? color : "#3987e5"}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-8 w-10 rounded border border-border/50 bg-transparent cursor-pointer"
                      />
                      <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-8 text-xs font-mono flex-1" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Extra series colors</label>
                    <Input
                      value={extraColors}
                      onChange={(e) => setExtraColors(e.target.value)}
                      placeholder="#d95926, #199e70, …"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  {(chartType === "bar" || chartType === "line") && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">X axis label</label>
                        <Input value={xAxisLabel} onChange={(e) => setXAxisLabel(e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Y axis label</label>
                        <Input value={yAxisLabel} onChange={(e) => setYAxisLabel(e.target.value)} className="h-8 text-xs" />
                      </div>
                    </>
                  )}
                </div>
                {mockPreview && mockPreview.series.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Series labels</label>
                    <div className="grid grid-cols-2 gap-2">
                      {mockPreview.series.map((s) => (
                        <div key={s.label} className="space-y-1">
                          <span className="text-[10px] text-muted-foreground font-mono truncate block">{s.label}</span>
                          <Input
                            value={seriesLabels[s.label] ?? ""}
                            onChange={(e) => setSeriesLabels((prev) => ({ ...prev, [s.label]: e.target.value }))}
                            placeholder={s.label}
                            className="h-7 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || !title.trim() || !metric} className="flex-1">
              {existing ? "Save changes" : "Add widget"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
