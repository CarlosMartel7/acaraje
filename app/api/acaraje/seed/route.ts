import { NextRequest, NextResponse } from "next/server";
import { faker } from "@faker-js/faker";
import { prisma } from "@/lib/prisma";
import { parseSchema } from "@/lib/schema-parser";

function getDelegate(modelName: string): any {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return (prisma as any)[key];
}

function generateFieldValue(fieldName: string, fieldType: string, enumValues?: string[]): any {
  // Enums
  if (enumValues && enumValues.length > 0) {
    return faker.helpers.arrayElement(enumValues);
  }

  const name = fieldName.toLowerCase();

  if (fieldType === "String") {
    if (name.includes("email")) return faker.internet.email();
    if (name.includes("password") || name.includes("hash")) return faker.internet.password({ length: 60 });
    if (name.includes("phone")) return faker.phone.number();
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
    if (name.includes("baseprice") || name.includes("price") || name.includes("unitprice") || name.includes("total") || name.includes("subtotal") || name.includes("amount")) {
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
  if (fieldType === "Json") return faker.helpers.arrayElement([
    { color: faker.helpers.arrayElement(["red", "blue", "green", "black", "white"]) },
    { size: faker.helpers.arrayElement(["S", "M", "L", "XL"]) },
    { color: faker.color.human(), size: faker.helpers.arrayElement(["S", "M", "L"]) },
  ]);

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { modelName, count = 5 } = await req.json();

    const schema = parseSchema();
    const modelDef = schema.models.find(
      (m) => m.name.toLowerCase() === modelName.toLowerCase()
    );

    if (!modelDef) {
      return NextResponse.json({ error: `Model "${modelName}" not found` }, { status: 404 });
    }

    const delegate = getDelegate(modelName);
    if (!delegate) {
      return NextResponse.json({ error: `Prisma delegate not found for "${modelName}"` }, { status: 404 });
    }

    const created: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < count; i++) {
      const data: Record<string, any> = {};

      for (const field of modelDef.fields) {
        // Skip auto-managed fields
        if (field.isId && field.hasDefault) continue;
        if (["createdAt", "updatedAt"].includes(field.name)) continue;
        if (field.isList) continue; // skip array relations

        // Skip relation back-references (no FK field)
        if (field.isRelation && (!field.relationFields || field.relationFields.length === 0)) continue;

        // For FK fields (e.g. userId), skip — we'll handle via relationFields
        // For relation fields with FK, fetch a random related record
        if (field.isRelation && field.relationFields && field.relationFields.length > 0) {
          try {
            const relDelegate = getDelegate(field.type);
            if (relDelegate) {
              const relRecords = await relDelegate.findMany({ take: 10 });
              if (relRecords.length > 0) {
                const relRecord = relRecords[Math.floor(Math.random() * relRecords.length)];
                // Set the FK field value
                for (const fkField of field.relationFields) {
                  data[fkField] = relRecord.id;
                }
              } else {
                // No related records — skip optional, error required
                if (field.isRequired) {
                  errors.push(`No ${field.type} records found for relation ${field.name}. Seed ${field.type} first.`);
                }
              }
            }
          } catch {
            // ignore relation errors
          }
          continue;
        }

        // For FK id fields that are already handled above via relation, skip
        const isHandledByRelation = modelDef.fields.some(
          (f) =>
            f.isRelation &&
            f.relationFields &&
            f.relationFields.includes(field.name)
        );
        if (isHandledByRelation) continue;

        // Optional field — 30% chance to leave null
        if (!field.isRequired && Math.random() < 0.3) continue;

        // Find enum values if applicable
        const enumDef = schema.enums.find((e) => e.name === field.type);
        const value = generateFieldValue(field.name, field.type, enumDef?.values);
        if (value !== null && value !== undefined) {
          data[field.name] = value;
        }
      }

      try {
        const record = await delegate.create({ data });
        created.push(record);
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return NextResponse.json({ created: created.length, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Get record counts per model
export async function GET() {
  const schema = parseSchema();
  const counts: Record<string, number> = {};

  for (const model of schema.models) {
    try {
      const delegate = getDelegate(model.name);
      if (delegate) {
        counts[model.name] = await delegate.count();
      }
    } catch {
      counts[model.name] = 0;
    }
  }

  return NextResponse.json({ counts });
}
