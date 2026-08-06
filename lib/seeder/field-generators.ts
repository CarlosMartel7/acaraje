import { FAKER_PRESETS } from "@/lib/seeder/faker-presets";

const GENERATOR_LABELS: Record<Seeder.GeneratorKind, string> = {
  default: "Built-in (auto)",
  faker: "Faker preset",
  int: "Integer range",
  float: "Float range",
  boolean: "Boolean",
  enum: "Enum pick",
  fixed: "Fixed value",
  skip: "Skip field",
};

export function isSeedableField(field: Schema.Field): boolean {
  if (field.isId && field.hasDefault) return false;
  if (["createdAt", "updatedAt"].includes(field.name)) return false;
  if (field.isList) return false;
  if (field.isRelation && (!field.relationFields || field.relationFields.length === 0)) return false;
  return true;
}

export function isEnumField(field: Schema.Field, schema: Schema.SchemaData): boolean {
  return schema.enums.some((e) => e.name === field.type);
}

function allowedKindsForType(fieldType: string, isEnum: boolean): Seeder.GeneratorKind[] {
  if (isEnum) {
    return ["default", "enum", "fixed", "skip"];
  }

  switch (fieldType) {
    case "Boolean":
      return ["default", "boolean", "fixed", "skip"];
    case "String":
      return ["default", "faker", "fixed", "skip"];
    case "Int":
    case "BigInt":
      return ["default", "int", "fixed", "skip"];
    case "Float":
    case "Decimal":
      return ["default", "float", "fixed", "skip"];
    case "DateTime":
      return ["default", "faker", "fixed", "skip"];
    case "Json":
      return ["default", "fixed", "skip"];
    default:
      return ["default", "skip"];
  }
}

/** Generator kinds valid for a Prisma field type. */
export function allowedGeneratorKinds(field: Schema.Field, schema: Schema.SchemaData): Seeder.GeneratorKind[] {
  return allowedKindsForType(field.type, isEnumField(field, schema));
}

export function isRuleCompatibleWithType(
  kind: Seeder.GeneratorKind,
  fieldType: string,
  isEnum: boolean,
): boolean {
  if (kind === "default") return true;
  return allowedKindsForType(fieldType, isEnum).includes(kind);
}

export function generatorKindOptions(field: Schema.Field, schema: Schema.SchemaData) {
  return allowedGeneratorKinds(field, schema).map((value) => ({
    value,
    label: GENERATOR_LABELS[value],
  }));
}

const STRING_FAKER_PATHS = new Set([
  "internet.email",
  "person.fullName",
  "company.name",
  "commerce.productName",
  "lorem.sentence",
  "lorem.words",
  "lorem.paragraph",
  "phone.number",
  "internet.password",
  "internet.url",
  "image.url",
  "location.city",
  "location.country",
  "location.streetAddress",
  "location.zipCode",
  "string.alphanumeric",
  "string.uuid",
]);

const DATE_FAKER_PATHS = new Set(["date.past", "date.recent", "date.future"]);

export function fakerPresetsForField(field: Schema.Field, schema: Schema.SchemaData) {
  if (field.type === "DateTime") {
    return FAKER_PRESETS.filter((p) => DATE_FAKER_PATHS.has(p.path));
  }
  if (field.type === "String") {
    return FAKER_PRESETS.filter((p) => STRING_FAKER_PATHS.has(p.path));
  }
  return [];
}

export function emptyRuleForKind(kind: Seeder.GeneratorKind, field: Schema.Field, schema: Schema.SchemaData): Seeder.FieldGenerator {
  switch (kind) {
    case "faker": {
      const presets = fakerPresetsForField(field, schema);
      return { kind: "faker", path: presets[0]?.path ?? "lorem.words" };
    }
    case "int":
      return { kind: "int", min: 0, max: 100 };
    case "float":
      return { kind: "float", min: 0, max: 100, fractionDigits: 2 };
    case "boolean":
      return { kind: "boolean", trueChance: 0.5 };
    case "enum":
      return { kind: "enum" };
    case "fixed":
      return { kind: "fixed", value: field.type === "Boolean" ? true : "" };
    case "skip":
      return { kind: "skip" };
    default:
      return { kind: "default" };
  }
}

export function isValidFieldRule(
  field: Schema.Field,
  schema: Schema.SchemaData,
  rule: Seeder.FieldGenerator | undefined,
): boolean {
  if (!rule || rule.kind === "default") return true;
  return allowedGeneratorKinds(field, schema).includes(rule.kind);
}

/** Drop or normalize rules that do not match the field type. */
export function sanitizeFieldRule(
  field: Schema.Field,
  schema: Schema.SchemaData,
  rule: Seeder.FieldGenerator | undefined,
): Seeder.FieldGenerator | undefined {
  if (!rule || rule.kind === "default") return undefined;
  if (!allowedGeneratorKinds(field, schema).includes(rule.kind)) return undefined;

  if (rule.kind === "faker") {
    const allowed = new Set(fakerPresetsForField(field, schema).map((p) => p.path));
    if (!allowed.has(rule.path)) {
      const fallback = fakerPresetsForField(field, schema)[0];
      if (!fallback) return undefined;
      return { kind: "faker", path: fallback.path };
    }
  }

  if (rule.kind === "enum" && isEnumField(field, schema) && rule.values?.length) {
    const enumValues = schema.enums.find((e) => e.name === field.type)?.values ?? [];
    const filtered = rule.values.filter((v) => enumValues.includes(v));
    return filtered.length ? { kind: "enum", values: filtered } : { kind: "enum" };
  }

  return rule;
}
