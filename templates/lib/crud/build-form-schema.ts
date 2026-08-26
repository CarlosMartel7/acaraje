import { code, imp } from "ts-poet";

const z = imp("z@zod")
const getEnumValues = imp("getEnumValues@@/lib/enum-values")

export const writeBuildFormSchema = () => code`
/** Same eligibility rules DynamicForm has always used: skip list back-relations, auto ids,
 *  timestamps, and relation fields with no FK column to write through. */
export function isEditableField(field: Schema.Field): boolean {
  if (field.isList) return false;
  if (field.isId && field.hasDefault) return false;
  if (["createdAt", "updatedAt"].includes(field.name)) return false;
  if (field.isRelation && (!field.relationFields || field.relationFields.length === 0)) return false;
  return true;
}

export function editableFields(fields: Schema.Field[]): Schema.Field[] {
  return fields.filter(isEditableField);
}

/** The form-state key a field's value lives under. Relation fields write through their FK column
 *  (e.g. \`user\` -> \`userId\`) — the same column the raw scalar FK field (also present in \`fields\`)
 *  writes through, so both controls end up editing the same form value. */
export function formKey(field: Schema.Field): string {
  return field.isRelation ? (field.relationFields?.[0] ?? field.name) : field.name;
}

function emptyToUndefined(val: unknown) {
  return val === "" || val === undefined || val === null ? undefined : val;
}

/** Validation-only Zod schema keyed by \`formKey\`. Required fields with a DB default, and booleans,
 *  are never required client-side — matches the leniency DynamicForm always had ("leave for server
 *  to catch"). Submission coercion is a separate step, see \`coerceFormValues\`. */
export function buildFormSchema(fields: Schema.Field[], enums: Schema.EnumType[]) {
  const shape: Record<string, ${z}.ZodTypeAny> = {};

  for (const field of editableFields(fields)) {
    const key = formKey(field);

    if (field.type === "Boolean") {
      shape[key] = ${z}.boolean();
      continue;
    }

    const enumValues = ${getEnumValues}(field, enums);
    let base: ${z}.ZodTypeAny;
    if (enumValues && enumValues.length > 0) {
      base = ${z}.enum(enumValues as [string, ...string[]]);
    } else if (field.type === "Int") {
      base = ${z}.coerce.number().int();
    } else if (field.type === "Float" || field.type === "Decimal") {
      base = ${z}.coerce.number();
    } else if (field.type === "DateTime") {
      base = ${z}.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date");
    } else {
      base = ${z}.string();
    }

    const required = field.isRequired && !field.hasDefault;
    const withEmpty = ${z}.preprocess(emptyToUndefined, base);
    shape[key] = required ? withEmpty : withEmpty.optional();
  }

  return ${z}.object(shape);
}

/** Builds the payload actually sent to the API — same per-type coercion the server has always
 *  expected (parseInt/parseFloat/ISO datetime/boolean), skipping unset optional fields. */
export function coerceFormValues(fields: Schema.Field[], values: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of editableFields(fields)) {
    const key = formKey(field);
    const val = values[key];
    if (val === undefined || val === "") continue;
    if (field.type === "Int") data[key] = parseInt(String(val), 10);
    else if (field.type === "Float" || field.type === "Decimal") data[key] = parseFloat(String(val));
    else if (field.type === "Boolean") data[key] = val === true || val === "true";
    else if (field.type === "DateTime") data[key] = new Date(String(val)).toISOString();
    else data[key] = val;
  }
  return data;
}
`;

export default writeBuildFormSchema;
