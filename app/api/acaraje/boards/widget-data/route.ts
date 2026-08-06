import { NextRequest, NextResponse } from "next/server";
import { parseSchema } from "@/lib/schema-parser";
import { getDelegate } from "@/lib/prisma-delegate";

/** Soft cap on rows pulled client-side where there's no DB-side equivalent (Bar cross-model, Line bucketing). */
const ROW_SAMPLE_CAP = 10000;
/** Line charts only ever show this many most-recent buckets — a fixed default, not user-editable. */
const LINE_BUCKET_LIMIT = 5;

function findModel(schema: PrismaSchema.ParsedSchema, modelName: string): PrismaSchema.PrismaModel | null {
  return schema.models.find((m) => m.name.toLowerCase() === modelName.toLowerCase()) ?? null;
}

function findField(model: PrismaSchema.PrismaModel, fieldName: string): PrismaSchema.PrismaField | null {
  return model.fields.find((f) => f.name === fieldName) ?? null;
}

function toNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && typeof v.toNumber === "function") return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function aggregateNumbers(values: number[], op: Boards.AggregateOp): number {
  if (values.length === 0) return 0;
  switch (op) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}

/** Resolves a groupBy/filter field name to the actual scalar column Prisma's groupBy/where can use —
 *  for relation fields this is the underlying FK (e.g. "category" -> "categoryId"). */
function resolveGroupByColumn(
  model: PrismaSchema.PrismaModel,
  fieldName: string,
): { column: string; field: PrismaSchema.PrismaField } | null {
  const field = findField(model, fieldName);
  if (!field) return null;
  if (field.isRelation) {
    const fk = field.relationFields?.[0];
    if (!fk) return null;
    return { column: fk, field };
  }
  return { column: field.name, field };
}

/** For relation groupBy columns, maps related record ids to a human label; empty map otherwise
 *  (caller falls back to stringifying the raw value, which is already legible for enums/booleans). */
async function labelMap(field: PrismaSchema.PrismaField, ids: any[]): Promise<Map<any, string>> {
  const map = new Map<any, string>();
  if (!field.isRelation) return map;
  const uniqueIds = [...new Set(ids)].filter((v) => v !== null && v !== undefined);
  if (uniqueIds.length === 0) return map;

  const delegate = getDelegate(field.type);
  if (!delegate) return map;

  const schema = parseSchema();
  const relatedModel = findModel(schema, field.type);
  const labelCandidates = ["name", "title", "email", "code", "slug", "label", "storeName"];
  const labelField = relatedModel?.fields.find((f) => labelCandidates.includes(f.name))?.name ?? null;

  const records = await delegate.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, ...(labelField ? { [labelField]: true } : {}) },
  });
  for (const r of records) {
    map.set(r.id, labelField ? String(r[labelField]) : String(r.id));
  }
  return map;
}

/** Resolves an EqualsFilter into a Prisma `where` object, or undefined if there's no filter. */
function buildWhere(model: PrismaSchema.PrismaModel, filter?: Boards.EqualsFilter): Record<string, any> | undefined {
  if (!filter) return undefined;
  const resolved = resolveGroupByColumn(model, filter.field);
  if (!resolved) throw new Error(`Filter field "${filter.field}" not found on model "${model.name}"`);
  return { [resolved.column]: filter.value };
}

/** Runs a single count/sum/avg/min/max on a model, used by Stat-simple, both legs of Stat-divide,
 *  and Line's/Bar's same-model Y. */
async function runSimpleMetric(schema: PrismaSchema.ParsedSchema, spec: Boards.SimpleMetric): Promise<number> {
  const model = findModel(schema, spec.model);
  if (!model) throw new Error(`Model "${spec.model}" not found`);
  const delegate = getDelegate(spec.model);
  if (!delegate) throw new Error(`Prisma delegate not found for "${spec.model}"`);
  const where = buildWhere(model, spec.filter);

  if (spec.op === "count") {
    return delegate.count({ where });
  }
  if (!spec.field) throw new Error(`"field" is required when op is "${spec.op}"`);
  const opKey = `_${spec.op}`;
  const result = await delegate.aggregate({ where, [opKey]: { [spec.field]: true } });
  return toNumber(result[opKey]?.[spec.field]);
}

async function computePie(schema: PrismaSchema.ParsedSchema, spec: Boards.PieMetric): Promise<Boards.SeriesResult> {
  const model = findModel(schema, spec.model);
  if (!model) throw new Error(`Model "${spec.model}" not found`);
  const field = findField(model, spec.field);
  if (!field || !schema.enums.some((e) => e.name === field.type)) {
    throw new Error(`Pie charts require an enum field on "${spec.model}" (e.g. role)`);
  }
  const resolved = resolveGroupByColumn(model, spec.field);
  if (!resolved) throw new Error(`Field "${spec.field}" not found on model "${spec.model}"`);
  const delegate = getDelegate(spec.model);
  if (!delegate) throw new Error(`Prisma delegate not found for "${spec.model}"`);

  const rows: any[] = await delegate.groupBy({ by: [resolved.column], _count: { _all: true } });
  const labels = await labelMap(
    resolved.field,
    rows.map((r) => r[resolved.column]),
  );

  return {
    label: spec.model,
    points: rows.map((r) => ({
      bucket: labels.get(r[resolved.column]) ?? String(r[resolved.column] ?? "(none)"),
      value: r._count._all,
    })),
  };
}

function bucketDate(date: Date, bucket: "day" | "week" | "month" | "year"): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (bucket === "day") return d.toISOString().slice(0, 10);
  if (bucket === "month") return d.toISOString().slice(0, 7);
  if (bucket === "year") return d.toISOString().slice(0, 4);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

async function computeLine(
  schema: PrismaSchema.ParsedSchema,
  spec: Boards.LineMetric,
  notes: string[],
): Promise<Boards.SeriesResult> {
  const model = findModel(schema, spec.model);
  if (!model) throw new Error(`Model "${spec.model}" not found`);
  const dateField = findField(model, spec.dateField);
  if (!dateField || dateField.type !== "DateTime") {
    throw new Error(`"${spec.dateField}" is not a DateTime field on model "${spec.model}"`);
  }
  if (spec.y.op !== "count" && !spec.y.field) {
    throw new Error(`"field" is required when op is "${spec.y.op}"`);
  }
  const delegate = getDelegate(spec.model);
  if (!delegate) throw new Error(`Prisma delegate not found for "${spec.model}"`);

  const where = buildWhere(model, spec.y.filter);
  // Most-recent-first under the row cap reliably captures the last LINE_BUCKET_LIMIT buckets.
  const rows: any[] = await delegate.findMany({
    where,
    orderBy: { [spec.dateField]: "desc" },
    take: ROW_SAMPLE_CAP,
    select: { [spec.dateField]: true, ...(spec.y.op !== "count" && spec.y.field ? { [spec.y.field]: true } : {}) },
  });
  if (rows.length >= ROW_SAMPLE_CAP) notes.push(`Sampled most recent ${ROW_SAMPLE_CAP.toLocaleString()} rows`);

  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    const raw = r[spec.dateField];
    if (!raw) continue;
    const key = bucketDate(new Date(raw), spec.bucket);
    const value = spec.y.op === "count" ? 1 : toNumber(r[spec.y.field!]);
    const arr = buckets.get(key) ?? [];
    arr.push(value);
    buckets.set(key, arr);
  }

  const op: Boards.AggregateOp = spec.y.op === "count" ? "sum" : spec.y.op;
  const bucketKeys = [...buckets.keys()].sort().slice(-LINE_BUCKET_LIMIT);
  return {
    label: spec.model,
    points: bucketKeys.map((key) => ({ bucket: key, value: aggregateNumbers(buckets.get(key)!, op) })),
  };
}

async function computeBar(
  schema: PrismaSchema.ParsedSchema,
  spec: Boards.BarMetric,
  notes: string[],
): Promise<Boards.SeriesResult> {
  const model = findModel(schema, spec.model);
  if (!model) throw new Error(`Model "${spec.model}" not found`);
  const xResolved = resolveGroupByColumn(model, spec.field);
  if (!xResolved) throw new Error(`Field "${spec.field}" not found on model "${spec.model}"`);
  const delegate = getDelegate(spec.model);
  if (!delegate) throw new Error(`Prisma delegate not found for "${spec.model}"`);
  if (spec.y.op !== "count" && !spec.y.field) {
    throw new Error(`"field" is required when op is "${spec.y.op}"`);
  }

  if (!spec.y.via) {
    // Same-model: a single groupBy/aggregate call covers it.
    const where = buildWhere(model, spec.y.filter);
    const opKey = spec.y.op === "count" ? "_count" : `_${spec.y.op}`;
    const aggArg = spec.y.op === "count" ? { _all: true } : { [spec.y.field!]: true };
    const rows: any[] = await delegate.groupBy({ by: [xResolved.column], where, [opKey]: aggArg });
    const labels = await labelMap(
      xResolved.field,
      rows.map((r) => r[xResolved.column]),
    );
    return {
      label: spec.model,
      points: rows.map((r) => ({
        bucket: labels.get(r[xResolved.column]) ?? String(r[xResolved.column] ?? "(none)"),
        value: spec.y.op === "count" ? r._count._all : toNumber(r[opKey]?.[spec.y.field!]),
      })),
    };
  }

  // Cross-model: Prisma can't groupBy+aggregate across a relation in one call, so pull each row's
  // bucket key plus its related rows/count, then reduce per-bucket in JS.
  const viaField = findField(model, spec.y.via);
  if (!viaField || !viaField.isList || !viaField.isRelation) {
    throw new Error(`"${spec.y.via}" is not a to-many relation on model "${spec.model}"`);
  }
  const targetModel = findModel(schema, viaField.type);
  if (!targetModel) throw new Error(`Model "${viaField.type}" not found`);
  const targetWhere = buildWhere(targetModel, spec.y.filter);

  const rows: any[] = await delegate.findMany({
    take: ROW_SAMPLE_CAP,
    select: {
      [xResolved.column]: true,
      ...(spec.y.op === "count"
        ? { _count: { select: { [spec.y.via]: { where: targetWhere } } } }
        : { [spec.y.via]: { where: targetWhere, select: { [spec.y.field!]: true } } }),
    },
  });
  if (rows.length >= ROW_SAMPLE_CAP) notes.push(`Sampled first ${ROW_SAMPLE_CAP.toLocaleString()} rows`);

  const buckets = new Map<any, number[]>();
  for (const r of rows) {
    const key = r[xResolved.column];
    const arr = buckets.get(key) ?? [];
    if (spec.y.op === "count") {
      arr.push(r._count[spec.y.via] as number);
    } else {
      const related = r[spec.y.via] as any[];
      for (const item of related) arr.push(toNumber(item[spec.y.field!]));
    }
    buckets.set(key, arr);
  }
  const labels = await labelMap(xResolved.field, [...buckets.keys()]);
  const op: Boards.AggregateOp = spec.y.op === "count" ? "sum" : spec.y.op;
  return {
    label: spec.model,
    points: [...buckets.entries()].map(([key, values]) => ({
      bucket: labels.get(key) ?? String(key ?? "(none)"),
      value: aggregateNumbers(values, op),
    })),
  };
}

async function computeStat(
  schema: PrismaSchema.ParsedSchema,
  spec: Boards.StatMetric,
): Promise<{ result: Boards.SeriesResult; note?: string }> {
  if (spec.mode === "simple") {
    const value = await runSimpleMetric(schema, spec.metric);
    return { result: { label: spec.metric.model, points: [{ bucket: "total", value }] } };
  }
  const [numerator, denominator] = await Promise.all([
    runSimpleMetric(schema, spec.numerator),
    runSimpleMetric(schema, spec.denominator),
  ]);
  const value = denominator === 0 ? 0 : numerator / denominator;
  return {
    result: { label: `${spec.numerator.model} / ${spec.denominator.model}`, points: [{ bucket: "total", value }] },
    note: denominator === 0 ? "Denominator is 0" : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const metric = body.metric as Boards.MetricSpec | undefined;
    if (!metric) {
      return NextResponse.json({ error: "metric is required" }, { status: 400 });
    }

    const schema = parseSchema();
    const notes: string[] = [];

    let series: Boards.SeriesResult[];
    switch (metric.chartType) {
      case "pie":
        series = [await computePie(schema, metric)];
        break;
      case "line":
        series = [await computeLine(schema, metric, notes)];
        break;
      case "bar":
        series = [await computeBar(schema, metric, notes)];
        break;
      case "stat": {
        const { result, note } = await computeStat(schema, metric);
        if (note) notes.push(note);
        series = [result];
        break;
      }
    }

    const response: Boards.WidgetDataResponse = {
      chartType: metric.chartType,
      series,
      meta: { generatedAt: new Date().toISOString(), note: notes[0] },
    };
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to compute widget data" }, { status: 500 });
  }
}
