/**
 * Ambient app types grouped by service. Do not import — use `Drive.*`, `Schema.*`, etc.
 */

/** Auth — env-based admin session (no Prisma auth models) */
declare namespace Auth {
  interface SessionPayload {
    username: string;
    exp: number;
  }

  interface SessionResponse {
    authenticated: boolean;
    username?: string;
  }
}

/** Drive — MinIO object browser UI */
declare namespace Drive {
  type DriveType = "minio";

  interface SelectedFolder {
    folderId: string;
    name: string;
  }

  interface SelectedFile {
    file: File;
    id: string;
    displayName: string;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
  }

  interface FolderNode {
    id: string;
    name: string;
    children?: FolderNode[];
    webViewLink?: string;
  }

  interface SelectedItems {
    folders: string[];
    files: string[];
  }
}

/** Storage — MinIO / S3-compatible object storage */
declare namespace Storage {
  type StorageDriver = "minio";

  interface MinioEnvConfig {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  }

  interface MinioFolderRecord {
    id: string;
    name: string;
    parents: string[];
  }

  interface FolderEntry {
    id: string;
    name: string;
  }

  interface FileEntry {
    key: string;
    name: string;
    size: number;
    lastModified: Date;
  }

  interface FolderContentsResult {
    folders: FolderEntry[];
    files: FileEntry[];
  }

  interface StorageFileEntry {
    key: string;
    size: number;
    lastModified: Date;
  }

  interface ObjectStorage {
    ensureBucket(): Promise<void>;
    uploadFile(
      key: string,
      data: Buffer | Uint8Array | import("stream").Readable,
      options?: { contentType?: string; size?: number },
    ): Promise<void>;
    downloadFile(key: string): Promise<Buffer>;
    deleteFile(key: string): Promise<void>;
    listFiles(prefix?: string): Promise<StorageFileEntry[]>;
  }
}

/** Schema — introspection UI (models, enums, fields from API) */
declare namespace Schema {
  interface Field {
    name: string;
    type: string;
    isRequired: boolean;
    isList: boolean;
    isId: boolean;
    isUnique: boolean;
    hasDefault: boolean;
    defaultValue?: string;
    isRelation: boolean;
    attributes: string[];
    /** FK field names when @relation uses `fields: [...]` */
    relationFields?: string[];
    /** Set when the field has a trailing `// @enum A | B | C` comment (pseudo-enum convention for
     *  providers with no native `enum`, e.g. SQLite) — see `lib/schema-parser.ts`. */
    pseudoEnumValues?: string[];
  }

  interface Model {
    name: string;
    fields: Field[];
    mapName?: string;
    indexes: string[];
  }

  interface EnumType {
    name: string;
    values: string[];
  }

  interface SchemaData {
    models: Model[];
    enums: EnumType[];
    datasource: { provider: string; url: string } | null;
    generator: { provider: string } | null;
  }
}

/** Dashboard — stats overview */
declare namespace Dashboard {
  interface DashboardStats {
    totalModels: number;
    totalEnums: number;
    totalFields: number;
    totalRelations: number;
    totalIndexes: number;
    modelsWithMap: number;
    topFieldTypes: { type: string; count: number }[];
    relationTypeCount: {
      "one-to-one": number;
      "one-to-many": number;
      "many-to-one": number;
      "many-to-many": number;
    };
    modelsOverview: {
      name: string;
      fieldCount: number;
      relationCount: number;
      recordCount: number;
    }[];
  }
}

/** PrismaSchema — `lib/schema-parser` (raw Prisma file AST) */
declare namespace PrismaSchema {
  interface PrismaField {
    name: string;
    type: string;
    isRequired: boolean;
    isList: boolean;
    isId: boolean;
    isUnique: boolean;
    hasDefault: boolean;
    defaultValue?: string;
    isRelation: boolean;
    relationFields?: string[];
    attributes: string[];
    /** Set when the field has a trailing `// @enum A | B | C` comment (pseudo-enum convention for
     *  providers with no native `enum`, e.g. SQLite) — see `lib/schema-parser.ts`. */
    pseudoEnumValues?: string[];
    rawLine: string;
  }

  interface PrismaModel {
    name: string;
    fields: PrismaField[];
    mapName?: string;
    indexes: string[];
  }

  interface PrismaEnum {
    name: string;
    values: string[];
  }

  interface PrismaRelation {
    from: string;
    fromField: string;
    to: string;
    type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  }

  interface ParsedSchema {
    models: PrismaModel[];
    enums: PrismaEnum[];
    relations: PrismaRelation[];
    datasource: {
      provider: string;
      url: string;
    } | null;
    generator: {
      provider: string;
    } | null;
    rawContent: string;
  }
}

/** Relations — graph / API relation shape */
declare namespace Relations {
  interface Relation {
    from: string;
    fromField: string;
    to: string;
    type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  }
}

/** Boards — manually-configured dashboard pages and chart widgets */
declare namespace Boards {
  type ChartType = "pie" | "bar" | "line" | "stat" | "table";
  type AggregateOp = "sum" | "avg" | "min" | "max";
  type Op = "count" | AggregateOp;

  interface EqualsFilter {
    /** Boolean / enum / relation-FK field on the target model. */
    field: string;
    /** Relation-FK -> related record's id. */
    value: string | number | boolean;
  }

  /** One level, reused by Line's Y, Bar's Y (same-model branch), and both legs of Stat's divide. */
  interface SimpleMetric {
    model: string;
    op: Op;
    /** Required iff op !== "count"; numeric field on `model`. */
    field?: string;
    filter?: EqualsFilter;
  }

  interface PieMetric {
    chartType: "pie";
    model: string;
    /** Enum-typed field on `model` (e.g. `role`). */
    field: string;
  }

  interface LineMetric {
    chartType: "line";
    model: string;
    /** DateTime field on `model`. */
    dateField: string;
    bucket: "day" | "week" | "month" | "year";
    /** y.model === model */
    y: SimpleMetric;
  }

  interface BarYTarget {
    /** undefined = same model as X's bucket model. Otherwise: an isRelation&&isList field
     *  name on X's model, pointing at the model actually being measured. */
    via?: string;
    op: Op;
    /** Numeric field on the target model (X's model, or via's target). */
    field?: string;
    /** field belongs to the target model. */
    filter?: EqualsFilter;
  }

  interface BarMetric {
    chartType: "bar";
    model: string;
    /** X bucket field — enum-typed field on `model`. */
    field: string;
    y: BarYTarget;
  }

  interface StatSimpleMetric {
    chartType: "stat";
    mode: "simple";
    metric: SimpleMetric;
  }
  interface StatDivideMetric {
    chartType: "stat";
    mode: "divide";
    numerator: SimpleMetric;
    denominator: SimpleMetric;
  }
  type StatMetric = StatSimpleMetric | StatDivideMetric;

  type MetricSpec = PieMetric | BarMetric | LineMetric | StatMetric;

  type WidgetSize = "1x1" | "2x2" | "3x3";

  /** Optional presentation overrides for a widget. */
  interface WidgetDisplay {
    /** Shown under the title. */
    subtitle?: string;
    /** Primary / single-series color (CSS color). */
    color?: string;
    /** Multi-series palette by index (CSS colors). */
    colors?: string[];
    /** X-axis title (bar, line). */
    xAxisLabel?: string;
    /** Y-axis title (bar, line). */
    yAxisLabel?: string;
    /** Map data series labels → custom legend / header labels. */
    seriesLabels?: Record<string, string>;
  }

  interface WidgetConfig {
    id: string;
    title: string;
    /** Grid footprint on the 4×3 board canvas. Stat widgets must be 1×1. */
    size?: WidgetSize;
    /** Subtitle, colors, axis titles, series label overrides. */
    display?: WidgetDisplay;
    /** chartType lives only here (metric.chartType) — not duplicated at the top level. */
    metric: MetricSpec;
    order: number;
  }

  interface Page {
    id: string;
    slug: string;
    name: string;
    order: number;
    widgets: WidgetConfig[];
  }

  interface ConfigFile {
    pages: Page[];
  }

  /** Normalized response from the widget-data route, uniform regardless of metric shape —
   *  rendering only ever branches on chartType. */
  interface SeriesResult {
    label: string;
    points: { bucket: string; value: number }[];
  }

  interface WidgetDataResponse {
    chartType: ChartType;
    series: SeriesResult[];
    meta?: { generatedAt: string; note?: string };
  }
}

/** Seeder — fake data generation rules */
declare namespace Seeder {
  type GeneratorKind = "default" | "faker" | "int" | "float" | "boolean" | "enum" | "fixed" | "skip";

  interface DefaultGenerator {
    kind: "default";
  }

  interface FakerGenerator {
    kind: "faker";
    /** Dot path on `@faker-js/faker`, e.g. `internet.email`. */
    path: string;
  }

  interface IntGenerator {
    kind: "int";
    min?: number;
    max?: number;
  }

  interface FloatGenerator {
    kind: "float";
    min?: number;
    max?: number;
    fractionDigits?: number;
  }

  interface BooleanGenerator {
    kind: "boolean";
    /** 0–1 chance of true when `value` is not set. */
    trueChance?: number;
    value?: boolean;
  }

  interface EnumGenerator {
    kind: "enum";
    /** Subset of enum values; omit to use all schema values. */
    values?: string[];
  }

  interface FixedGenerator {
    kind: "fixed";
    value: string | number | boolean | null;
  }

  interface SkipGenerator {
    kind: "skip";
  }

  type FieldGenerator =
    | DefaultGenerator
    | FakerGenerator
    | IntGenerator
    | FloatGenerator
    | BooleanGenerator
    | EnumGenerator
    | FixedGenerator
    | SkipGenerator;

  /** Per-model field generator overrides keyed by field name. */
  type ModelRules = Record<string, FieldGenerator>;

  interface ConfigFile {
    /** Chance (0–1) to leave optional fields null. Default 0.3. */
    optionalNullChance?: number;
    /** Model name → field name → generator rule. */
    models: Record<string, ModelRules>;
  }
}

/** Crud — CRUD operations */
declare namespace Crud {
  type RecordRow = Record<string, any>;

  interface PageData {
    records: RecordRow[];
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  }

  type FilterOperator = "contains" | "startsWith" | "endsWith" | "equals" | "not" | "gt" | "gte" | "lt" | "lte";

  interface FilterCondition {
    field: string;
    operator: FilterOperator;
    /** Always a string on the wire; parsed server-side per the field's kind. */
    value: string;
  }

  type SortOrder = "asc" | "desc";
}

/** Ui — shared primitives */
declare namespace Ui {
  type ButtonProps = import("react").ComponentPropsWithoutRef<"button"> & {
    asChild?: boolean;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  };
}
