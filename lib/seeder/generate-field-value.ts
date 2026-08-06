import { faker } from "@faker-js/faker";
import { isRuleCompatibleWithType } from "@/lib/seeder/field-generators";

const DEFAULT_OPTIONAL_NULL_CHANCE = 0.3;

function runFakerPath(path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = faker;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i]!;
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  if (typeof cur === "function") {
    try {
      return (cur as () => unknown)();
    } catch {
      return null;
    }
  }
  return null;
}

function defaultGenerateFieldValue(fieldName: string, fieldType: string, enumValues?: string[]): unknown {
  if (enumValues && enumValues.length > 0) {
    return faker.helpers.arrayElement(enumValues);
  }

  const name = fieldName.toLowerCase();

  if (fieldType === "String") {
    if (name.includes("email")) return faker.internet.email();
    if (name.includes("password") || name.includes("hash")) return faker.internet.password({ length: 60 });
    if (name.includes("phone")) return faker.phone.number({ style: "international" });
    if (name.includes("url") || name.includes("avatar") || name.includes("image") || name.includes("logo")) return faker.image.url();
    if (name.includes("slug")) return `${faker.helpers.slugify(faker.lorem.words(2))}-${faker.string.alphanumeric(6)}`;
    if (name.includes("sku")) return faker.string.alphanumeric(10).toUpperCase();
    if (name.includes("description") || name.includes("body") || name.includes("note")) return faker.lorem.sentence();
    if (name.includes("title")) return faker.lorem.sentence({ min: 3, max: 8 });
    if (name === "name") return faker.person.fullName();
    if (name.includes("name") || name.includes("label")) return faker.commerce.productName();
    if (name.includes("storename")) return faker.company.name();
    if (name.includes("country")) return faker.location.country();
    if (name.includes("city")) return faker.location.city();
    if (name.includes("state")) return faker.location.state({ abbreviated: true });
    if (name.includes("zip") || name.includes("postal") || name.includes("zipcode")) return faker.location.zipCode();
    if (name.includes("street")) return faker.location.streetAddress();
    if (name.includes("carrier")) return faker.helpers.arrayElement(["UPS", "FedEx", "USPS", "DHL"]);
    if (name.includes("tracking")) return faker.string.alphanumeric(12).toUpperCase();
    if (name.includes("code")) return faker.string.alphanumeric(8).toUpperCase();
    if (name.includes("transaction")) return `txn_${faker.string.alphanumeric(16)}`;
    if (name.includes("alttext")) return faker.lorem.words(3);
    return faker.lorem.words(2);
  }

  if (fieldType === "Int") {
    if (name.includes("stock")) return faker.number.int({ min: 0, max: 500 });
    if (name.includes("quantity") || name.includes("qty")) return faker.number.int({ min: 1, max: 10 });
    if (name.includes("rating")) return faker.number.int({ min: 1, max: 5 });
    if (name.includes("sort") || name.includes("order")) return faker.number.int({ min: 0, max: 100 });
    if (name.includes("usedcount")) return faker.number.int({ min: 0, max: 50 });
    if (name.includes("maxuses")) return faker.number.int({ min: 10, max: 1000 });
    return faker.number.int({ min: 0, max: 1000 });
  }

  if (fieldType === "Float" || fieldType === "Decimal") {
    if (name.includes("rating")) return faker.number.float({ min: 1, max: 5, fractionDigits: 1 });
    if (
      name.includes("baseprice") ||
      name.includes("price") ||
      name.includes("unitprice") ||
      name.includes("total") ||
      name.includes("subtotal") ||
      name.includes("amount")
    ) {
      return faker.commerce.price({ min: 1, max: 500 });
    }
    if (name.includes("shippingcost") || name.includes("tax") || name.includes("discount")) {
      return faker.commerce.price({ min: 0, max: 50 });
    }
    if (name.includes("value") || name.includes("minorderamt")) {
      return faker.commerce.price({ min: 1, max: 200 });
    }
    return faker.commerce.price({ min: 0, max: 1000 });
  }

  if (fieldType === "Boolean") return faker.datatype.boolean();
  if (fieldType === "DateTime") {
    if (name.includes("expires") || name.includes("expiresat")) return faker.date.future({ years: 1 });
    if (name.includes("estimated") || name.includes("shipped") || name.includes("delivered") || name.includes("paid")) {
      return faker.datatype.boolean() ? faker.date.recent({ days: 30 }) : null;
    }
    return faker.date.past({ years: 2 });
  }
  if (fieldType === "Json") {
    return faker.helpers.arrayElement([
      { color: faker.helpers.arrayElement(["red", "blue", "green", "black", "white"]) },
      { size: faker.helpers.arrayElement(["S", "M", "L", "XL"]) },
      { color: faker.color.human(), size: faker.helpers.arrayElement(["S", "M", "L"]) },
    ]);
  }

  return null;
}

function applyGeneratorRule(rule: Seeder.FieldGenerator, fieldName: string, fieldType: string, enumValues?: string[]): unknown {
  switch (rule.kind) {
    case "skip":
      return undefined;
    case "fixed": {
      if (typeof rule.value === "string") {
        const trimmed = rule.value.trim();
        if (trimmed === "null") return null;
        if (trimmed === "true") return true;
        if (trimmed === "false") return false;
        try {
          return JSON.parse(trimmed);
        } catch {
          return rule.value;
        }
      }
      return rule.value;
    }
    case "faker":
      return runFakerPath(rule.path) ?? defaultGenerateFieldValue(fieldName, fieldType, enumValues);
    case "int":
      return faker.number.int({ min: rule.min ?? 0, max: rule.max ?? 1000 });
    case "float":
      return faker.number.float({
        min: rule.min ?? 0,
        max: rule.max ?? 1000,
        fractionDigits: rule.fractionDigits ?? 2,
      });
    case "boolean":
      if (rule.value !== undefined) return rule.value;
      return Math.random() < (rule.trueChance ?? 0.5);
    case "enum": {
      const pool = rule.values?.length ? rule.values : enumValues;
      if (!pool?.length) return null;
      return faker.helpers.arrayElement(pool);
    }
    case "default":
    default:
      return defaultGenerateFieldValue(fieldName, fieldType, enumValues);
  }
}

export function generateFieldValue(
  config: Seeder.ConfigFile,
  modelName: string,
  fieldName: string,
  fieldType: string,
  enumValues?: string[],
): unknown {
  const rawRule = config.models[modelName]?.[fieldName];
  const isEnum = Boolean(enumValues?.length);
  const rule =
    rawRule && isRuleCompatibleWithType(rawRule.kind, fieldType, isEnum) ? rawRule : undefined;
  if (rule) return applyGeneratorRule(rule, fieldName, fieldType, enumValues);
  return defaultGenerateFieldValue(fieldName, fieldType, enumValues);
}

export function shouldSkipOptionalField(config: Seeder.ConfigFile, isRequired: boolean): boolean {
  if (isRequired) return false;
  const chance = config.optionalNullChance ?? DEFAULT_OPTIONAL_NULL_CHANCE;
  return Math.random() < chance;
}
