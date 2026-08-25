import { code, imp } from "ts-poet";

const FAKER_PRESETS = imp("FAKER_PRESETS@@/lib/seeder/faker-presets")

export const writeFieldGenerators = () => code`
const GENERATOR_LABELS: Record<Seeder.GeneratorKind, string> = {
  default: "Built-in (auto)",
  faker: "Faker preset",
  int: "Integer range",
  float: "Float range",
  boolean: "Boolean",
  enum: "Enum pick",
  fixed: "Fixed value",
  skip: "Skip field",
  override: "Ignore Typing",
};

export const OVERRIDE_TYPE_OPTIONS: { value: Seeder.OverrideType; label: string }[] = [
  { value: "String", label: "String" },
  { value: "Int", label: "Int" },
  { value: "BigInt", label: "BigInt" },
  { value: "Float", label: "Float" },
  { value: "Decimal", label: "Decimal" },
  { value: "Boolean", label: "Boolean" },
  { value: "DateTime", label: "DateTime" },
  { value: "Json", label: "Json" },
  { value: "Enum", label: "Enum" },
];

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

/** Generator kinds valid for a field type. "override" (Ignore Typing) is always available. */
function allowedKindsForType(fieldType: string, isEnum: boolean): Seeder.GeneratorKind[] {
  if (isEnum) {
    return ["default", "enum", "fixed", "skip", "override"];
  }

  switch (fieldType) {
    case "Boolean":
      return ["default", "boolean", "fixed", "skip", "override"];
    case "String":
      return ["default", "faker", "fixed", "skip", "override"];
    case "Int":
    case "BigInt":
      return ["default", "int", "fixed", "skip", "override"];
    case "Float":
    case "Decimal":
      return ["default", "float", "fixed", "skip", "override"];
    case "DateTime":
      return ["default", "faker", "fixed", "skip", "override"];
    case "Json":
      return ["default", "fixed", "skip", "override"];
    default:
      return ["default", "skip", "override"];
  }
}

/** Generator kinds valid for a Prisma field type. */
export function allowedGeneratorKinds(field: Schema.Field, schema: Schema.SchemaData): Seeder.GeneratorKind[] {
  return allowedKindsForType(field.type, isEnumField(field, schema));
}

/** Generator kinds valid for the type an "Ignore Typing" override pretends the field has. */
export function allowedKindsForOverrideType(overrideType: Seeder.OverrideType): Seeder.GeneratorKind[] {
  const isEnum = overrideType === "Enum";
  return allowedKindsForType(overrideType, isEnum).filter((k) => k !== "override");
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

export function generatorKindOptionsForOverrideType(overrideType: Seeder.OverrideType) {
  return allowedKindsForOverrideType(overrideType).map((value) => ({
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

function fakerPresetsForType(fieldType: string) {
  if (fieldType === "DateTime") {
    return ${FAKER_PRESETS}.filter((p) => DATE_FAKER_PATHS.has(p.path));
  }
  if (fieldType === "String") {
    return ${FAKER_PRESETS}.filter((p) => STRING_FAKER_PATHS.has(p.path));
  }
  return [];
}

export function fakerPresetsForField(field: Schema.Field, schema: Schema.SchemaData) {
  return fakerPresetsForType(field.type);
}

export function fakerPresetsForOverrideType(overrideType: Seeder.OverrideType) {
  return fakerPresetsForType(overrideType);
}

function emptyRuleForType(kind: Seeder.GeneratorKind, fieldType: string): Seeder.FieldGenerator {
  switch (kind) {
    case "faker": {
      const presets = fakerPresetsForType(fieldType);
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
      return { kind: "fixed", value: fieldType === "Boolean" ? true : "" };
    case "skip":
      return { kind: "skip" };
    case "override":
      return { kind: "override", overrideType: "String" };
    default:
      return { kind: "default" };
  }
}

export function emptyRuleForKind(kind: Seeder.GeneratorKind, field: Schema.Field, schema: Schema.SchemaData): Seeder.FieldGenerator {
  return emptyRuleForType(kind, field.type);
}

export function emptyRuleForOverrideType(kind: Seeder.GeneratorKind, overrideType: Seeder.OverrideType): Seeder.BaseGenerator {
  return emptyRuleForType(kind, overrideType) as Seeder.BaseGenerator;
}

export function isValidFieldRule(
  field: Schema.Field,
  schema: Schema.SchemaData,
  rule: Seeder.FieldGenerator | undefined,
): boolean {
  if (!rule || rule.kind === "default") return true;
  if (!allowedGeneratorKinds(field, schema).includes(rule.kind)) return false;
  if (rule.kind === "override" && rule.rule) {
    return allowedKindsForOverrideType(rule.overrideType).includes(rule.rule.kind);
  }
  return true;
}

/** Drop or normalize the nested rule of an override so it matches its overrideType. */
function sanitizeOverrideRule(rule: Seeder.OverrideGenerator): Seeder.OverrideGenerator {
  const { overrideType } = rule;
  const enumValues = overrideType === "Enum" ? rule.enumValues : undefined;
  const nested = rule.rule;

  if (!nested || nested.kind === "default" || !allowedKindsForOverrideType(overrideType).includes(nested.kind)) {
    return { kind: "override", overrideType, enumValues };
  }

  if (nested.kind === "faker") {
    const presets = fakerPresetsForOverrideType(overrideType);
    if (!presets.some((p) => p.path === nested.path)) {
      const fallback = presets[0];
      return fallback
        ? { kind: "override", overrideType, enumValues, rule: { kind: "faker", path: fallback.path } }
        : { kind: "override", overrideType, enumValues };
    }
  }

  if (nested.kind === "enum" && overrideType === "Enum" && nested.values?.length) {
    const pool = enumValues ?? [];
    const filtered = nested.values.filter((v) => pool.includes(v));
    return { kind: "override", overrideType, enumValues, rule: { kind: "enum", values: filtered.length ? filtered : undefined } };
  }

  return { kind: "override", overrideType, enumValues, rule: nested };
}

/** Drop or normalize rules that do not match the field type. */
export function sanitizeFieldRule(
  field: Schema.Field,
  schema: Schema.SchemaData,
  rule: Seeder.FieldGenerator | undefined,
): Seeder.FieldGenerator | undefined {
  if (!rule || rule.kind === "default") return undefined;
  if (!allowedGeneratorKinds(field, schema).includes(rule.kind)) return undefined;

  if (rule.kind === "override") {
    return sanitizeOverrideRule(rule);
  }

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
`;

export default writeFieldGenerators;
