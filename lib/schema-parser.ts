import fs from "fs";
import path from "path";

/** Built-in Prisma scalar types (field type is not another model/enum). */
const PRISMA_SCALAR_TYPES = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes",
  "Unsupported",
]);

function typeReferencesAnotherModel(
  type: string,
  modelNames: Set<string>,
  enumNames: Set<string>,
): boolean {
  if (PRISMA_SCALAR_TYPES.has(type)) return false;
  if (enumNames.has(type)) return false;
  return modelNames.has(type);
}

function parseFields(
  blockLines: string[],
  modelNames: Set<string>,
  enumNames: Set<string>,
): PrismaSchema.PrismaField[] {
  const fields: PrismaSchema.PrismaField[] = [];

  for (const line of blockLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@")) {
      continue;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;

    const name = parts[0];
    let type = parts[1];

    const isRequired = !type.endsWith("?");
    const isList = type.endsWith("[]");
    type = type.replace("?", "").replace("[]", "");

    const isId = trimmed.includes("@id");
    const isUnique = trimmed.includes("@unique");
    const hasDefault = trimmed.includes("@default");
    const hasExplicitRelation = trimmed.includes("@relation");
    const isRelation =
      hasExplicitRelation || typeReferencesAnotherModel(type, modelNames, enumNames);

    let defaultValue: string | undefined;
    const defaultMatch = trimmed.match(/@default\(([^)]+)\)/);
    if (defaultMatch) defaultValue = defaultMatch[1];

    const relationFields: string[] = [];
    if (hasExplicitRelation) {
      const relMatch = trimmed.match(/fields:\s*\[([^\]]+)\]/);
      if (relMatch) {
        relationFields.push(...relMatch[1].split(",").map((f) => f.trim()));
      }
    }

    // Collect attributes
    const attrs: string[] = [];
    const attrMatches = trimmed.matchAll(/@\w+(\([^)]*\))?/g);
    for (const m of attrMatches) attrs.push(m[0]);

    fields.push({
      name,
      type,
      isRequired,
      isList,
      isId,
      isUnique,
      hasDefault,
      defaultValue,
      isRelation,
      relationFields,
      attributes: attrs,
      rawLine: trimmed,
    });
  }

  return fields;
}

function extractBlock(content: string, keyword: string): { name: string; lines: string[] }[] {
  const results: { name: string; lines: string[] }[] = [];
  const regex = new RegExp(`^${keyword}\\s+(\\w+)\\s*\\{`, "gm");
  let match;

  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < content.length && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") depth--;
      i++;
    }
    const block = content.slice(start, i - 1);
    results.push({ name, lines: block.split("\n") });
  }

  return results;
}

function inferRelations(models: PrismaSchema.PrismaModel[]): PrismaSchema.PrismaRelation[] {
  const relations: PrismaSchema.PrismaRelation[] = [];
  const modelNames = new Set(models.map((m) => m.name));

  for (const model of models) {
    for (const field of model.fields) {
      if (!modelNames.has(field.type)) continue;
      if (field.isList) continue; // skip back-relations

      // Detect relation type
      // If this model has a FK (relationFields) pointing to another model
      if (field.isRelation && field.relationFields && field.relationFields.length > 0) {
        // Check if target model has a list back-relation
        const targetModel = models.find((m) => m.name === field.type);
        const backRelation = targetModel?.fields.find((f) => f.type === model.name);

        let relType: PrismaSchema.PrismaRelation["type"] = "many-to-one";
        if (backRelation) {
          if (backRelation.isList) {
            relType = "one-to-many";
          } else {
            relType = "one-to-one";
          }
        }

        relations.push({
          from: model.name,
          fromField: field.name,
          to: field.type,
          type: relType,
        });
      }
    }
  }

  // Detect many-to-many (models with only two FK fields to other models)
  for (const model of models) {
    const fkFields = model.fields.filter((f) => modelNames.has(f.type) && !f.isList && f.isRelation);
    if (fkFields.length === 2) {
      const isJoin = model.fields.every((f) => f.isId || f.isRelation || fkFields.some((fk) => fk === f) || f.name.endsWith("Id"));
      if (isJoin) {
        // Already captured as individual one-to-many, skip
      }
    }
  }

  return relations;
}

export function parseSchema(schemaPath?: string): PrismaSchema.ParsedSchema {
  const filePath = schemaPath || path.join(process.cwd(), "prisma", "schema.prisma");

  const rawContent = fs.readFileSync(filePath, "utf-8");

  const modelBlocks = extractBlock(rawContent, "model");
  const enumBlocks = extractBlock(rawContent, "enum");
  const modelNames = new Set(modelBlocks.map((b) => b.name));
  const enumNames = new Set(enumBlocks.map((b) => b.name));

  // Parse models
  const models: PrismaSchema.PrismaModel[] = modelBlocks.map(({ name, lines }) => {
    const mapMatch = lines.join("\n").match(/@@map\("([^"]+)"\)/);
    const indexMatches = [...lines.join("\n").matchAll(/@@\w+\([^)]*\)/g)].map((m) => m[0]);
    return {
      name,
      fields: parseFields(lines, modelNames, enumNames),
      mapName: mapMatch?.[1],
      indexes: indexMatches,
    };
  });

  // Parse enums
  const enums: PrismaSchema.PrismaEnum[] = enumBlocks.map(({ name, lines }) => ({
    name,
    values: lines.map((l) => l.trim()).filter((l) => l && !l.startsWith("//") && !l.startsWith("@")),
  }));

  // Parse datasource
  let datasource: PrismaSchema.ParsedSchema["datasource"] = null;
  const dsMatch = rawContent.match(/datasource\s+\w+\s*\{([^}]+)\}/);
  if (dsMatch) {
    const providerMatch = dsMatch[1].match(/provider\s*=\s*"([^"]+)"/);
    const urlMatch = dsMatch[1].match(/url\s*=\s*([^\n]+)/);
    datasource = {
      provider: providerMatch?.[1] || "unknown",
      url: urlMatch?.[1].trim() || "unknown",
    };
  }

  // Parse generator
  let generator: PrismaSchema.ParsedSchema["generator"] = null;
  const genMatch = rawContent.match(/generator\s+\w+\s*\{([^}]+)\}/);
  if (genMatch) {
    const providerMatch = genMatch[1].match(/provider\s*=\s*"([^"]+)"/);
    generator = { provider: providerMatch?.[1] || "unknown" };
  }

  const relations = inferRelations(models);

  return { models, enums, relations, datasource, generator, rawContent };
}
