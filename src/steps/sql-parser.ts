import fs from "fs";
import path from "path";

export type SqlDatabaseType = "Sqlite" | "Mysql" | "PostgreSql";

const DATASOURCE_PROVIDER: Record<SqlDatabaseType, string> = {
  Sqlite: "sqlite",
  Mysql: "mysql",
  PostgreSql: "postgresql",
};

const TABLE_CONSTRAINT_RE =
  /^(CONSTRAINT\s+[`"[]?\w+[`"\]]?\s+)?(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|KEY|INDEX)\b/i;

interface ForeignKeyRef {
  localCols: string[];
  refTable: string;
  refCols: string[];
}

function cleanIdentList(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim().replace(/^[`"[]|[`"\]]$/g, ""))
    .filter(Boolean);
}

/** Splits a `-- trailing comment` off a line, ignoring `--` inside quoted string literals. */
function splitTrailingComment(line: string): { code: string; comment: string } {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length - 1; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === "-" && line[i + 1] === "-") {
      return { code: line.slice(0, i).trim(), comment: line.slice(i + 2).trim() };
    }
  }
  return { code: line.trim(), comment: "" };
}

function extractTableBlocks(content: string): { name: string; lines: string[] }[] {
  const results: { name: string; lines: string[] }[] = [];
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?(\w+)[`"\]]?\s*\(/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    const start = match.index + match[0].length; // just past the opening "("
    let depth = 1;
    let i = start;
    while (i < content.length && depth > 0) {
      if (content[i] === "(") depth++;
      else if (content[i] === ")") depth--;
      i++;
    }
    const block = content.slice(start, i - 1);
    results.push({ name, lines: block.split("\n") });
  }

  return results;
}

function parseColumnField(
  rawLine: string,
  code: string,
  comment: string,
): PrismaSchema.PrismaField | null {
  const colMatch = code.match(/^[`"[]?(\w+)[`"\]]?\s+([\s\S]+)$/);
  if (!colMatch) return null;

  const name = colMatch[1];
  const rest = colMatch[2];

  const typeMatch = rest.match(/^(\w+)(\([^)]*\))?(\s*\[\])?/);
  if (!typeMatch) return null;

  const baseType = typeMatch[1];
  const typeArgs = typeMatch[2];
  const isList = !!typeMatch[3];
  const type = baseType + (typeArgs ?? "");
  const tail = rest.slice(typeMatch[0].length);

  const isId = /\bPRIMARY\s+KEY\b/i.test(tail);
  const isUnique = /\bUNIQUE\b/i.test(tail);
  const isRequired = isId || /\bNOT\s+NULL\b/i.test(tail);
  const hasDefault = /\bDEFAULT\b/i.test(tail);

  let defaultValue: string | undefined;
  const defaultMatch = tail.match(/DEFAULT\s+('[^']*'|"[^"]*"|\([^)]*\)|[^\s,]+)/i);
  if (defaultMatch) defaultValue = defaultMatch[1];

  // Single-field FK (`REFERENCES table(col)` inline on the column itself). Unlike Prisma, pure
  // SQL has no separate virtual relation field — the scalar column *is* the relation field, so
  // `relationFields` points back at its own name.
  const isRelation = /\bREFERENCES\b/i.test(tail);
  const relationFields: string[] = isRelation ? [name] : [];

  const attributes: string[] = [];
  if (isId) attributes.push("PRIMARY KEY");
  if (isUnique) attributes.push("UNIQUE");
  if (/AUTOINCREMENT|AUTO_INCREMENT|SERIAL|IDENTITY/i.test(tail)) attributes.push("@auto-increment");
  if (isRelation) attributes.push("FOREIGN KEY");

  // Native inline enum (MySQL: `role ENUM('A','B')`). PostgreSQL's named `CREATE TYPE ... AS
  // ENUM` is resolved separately into `ParsedSchema.enums`; SQLite has no enum syntax at all,
  // so its only path to constrained-choice is the `-- @enum` comment handled below.
  let pseudoEnumValues: string[] | undefined;
  if (/^ENUM$/i.test(baseType) && typeArgs) {
    pseudoEnumValues = typeArgs
      .slice(1, -1)
      .split(",")
      .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }

  // Same `// @enum A | B | C` convention as prisma-parser.ts's SQLite handling, adapted to a
  // SQL line comment (`-- @enum A | B | C`) — the only way to express an enum in a SQLite
  // schema.sql, since SQLite has neither ENUM columns nor CREATE TYPE.
  const enumComment = comment.match(/@enum\s+(.+)/i);
  if (enumComment) {
    const values = enumComment[1]
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length > 0) pseudoEnumValues = values;
  }

  return {
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
    attributes,
    pseudoEnumValues,
    rawLine,
  };
}

function parseConstraintLine(code: string):
  | { kind: "primary"; cols: string[] }
  | { kind: "unique"; cols: string[] }
  | { kind: "foreign"; fk: ForeignKeyRef }
  | { kind: "other" } {
  const stripped = code.replace(/^CONSTRAINT\s+[`"[]?\w+[`"\]]?\s+/i, "");

  const pk = stripped.match(/^PRIMARY\s+KEY\s*\(([^)]*)\)/i);
  if (pk) return { kind: "primary", cols: cleanIdentList(pk[1]) };

  const fk = stripped.match(
    /^FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+[`"[]?(\w+)[`"\]]?\s*(?:\(([^)]*)\))?/i,
  );
  if (fk) {
    return {
      kind: "foreign",
      fk: {
        localCols: cleanIdentList(fk[1]),
        refTable: fk[2],
        refCols: fk[3] ? cleanIdentList(fk[3]) : ["id"],
      },
    };
  }

  const uq = stripped.match(/^UNIQUE\s*\(([^)]*)\)/i);
  if (uq) return { kind: "unique", cols: cleanIdentList(uq[1]) };

  return { kind: "other" };
}

function parseTableBody(lines: string[]): {
  fields: PrismaSchema.PrismaField[];
  indexes: string[];
  fks: ForeignKeyRef[];
} {
  const fields: PrismaSchema.PrismaField[] = [];
  const fieldsByName = new Map<string, PrismaSchema.PrismaField>();
  const indexes: string[] = [];
  const fks: ForeignKeyRef[] = [];
  const constraintLines: string[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim().replace(/^,/, "").replace(/,\s*$/, "").trim();
    if (!trimmed) continue;

    const { code, comment } = splitTrailingComment(trimmed);
    if (!code) continue;

    if (TABLE_CONSTRAINT_RE.test(code)) {
      indexes.push(code);
      constraintLines.push(code);
      continue;
    }

    const field = parseColumnField(trimmed, code, comment);
    if (!field) continue;

    if (field.isRelation) {
      const inlineRef = code.match(/REFERENCES\s+[`"[]?(\w+)[`"\]]?\s*(?:\(([^)]*)\))?/i);
      if (inlineRef) {
        fks.push({
          localCols: [field.name],
          refTable: inlineRef[1],
          refCols: inlineRef[2] ? cleanIdentList(inlineRef[2]) : ["id"],
        });
      }
    }

    fields.push(field);
    fieldsByName.set(field.name, field);
  }

  for (const code of constraintLines) {
    const parsed = parseConstraintLine(code);

    if (parsed.kind === "primary") {
      for (const col of parsed.cols) {
        const field = fieldsByName.get(col);
        if (field) {
          field.isId = true;
          field.isRequired = true;
        }
      }
    } else if (parsed.kind === "unique" && parsed.cols.length === 1) {
      const field = fieldsByName.get(parsed.cols[0]);
      if (field) field.isUnique = true;
    } else if (parsed.kind === "foreign") {
      fks.push(parsed.fk);
      for (const col of parsed.fk.localCols) {
        const field = fieldsByName.get(col);
        if (field) {
          field.isRelation = true;
          if (!field.relationFields?.includes(col)) field.relationFields?.push(col);
        }
      }
    }
  }

  return { fields, indexes, fks };
}

function parsePostgresEnumTypes(content: string): PrismaSchema.PrismaEnum[] {
  const enums: PrismaSchema.PrismaEnum[] = [];
  const regex = /CREATE\s+TYPE\s+[`"]?(\w+)[`"]?\s+AS\s+ENUM\s*\(([^)]*)\)/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const values = match[2]
      .split(",")
      .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
    enums.push({ name: match[1], values });
  }

  return enums;
}

function buildRelations(
  models: PrismaSchema.PrismaModel[],
  fksByTable: Map<string, ForeignKeyRef[]>,
): PrismaSchema.PrismaRelation[] {
  const relations: PrismaSchema.PrismaRelation[] = [];
  const modelNames = new Set(models.map((m) => m.name));

  for (const model of models) {
    const fks = fksByTable.get(model.name) ?? [];

    for (const fk of fks) {
      if (!modelNames.has(fk.refTable)) continue;

      // No back-relation field exists in pure SQL to read a cardinality off of (unlike Prisma),
      // so uniqueness of the local FK column(s) is the only signal: a unique/PK FK column set
      // means at most one row per parent, i.e. one-to-one; otherwise many-to-one.
      const isLocalUnique = fk.localCols.every((col) => {
        const field = model.fields.find((f) => f.name === col);
        return !!field && (field.isId || field.isUnique);
      });

      relations.push({
        from: model.name,
        fromField: fk.localCols[0],
        to: fk.refTable,
        type: isLocalUnique ? "one-to-one" : "many-to-one",
      });
    }
  }

  return relations;
}

export function sqlParser(schemaPath: string, dbType: SqlDatabaseType): PrismaSchema.ParsedSchema {
  const filePath = schemaPath || path.join(process.cwd(), "database", "schema.sql");

  const rawContent = fs.readFileSync(filePath, "utf-8");
  // Strip block comments up front so they can't interfere with paren-depth or line parsing;
  // `-- ...` line comments are stripped per-line instead, since a trailing one may carry the
  // SQLite `@enum` convention and needs to survive until `parseColumnField` reads it.
  const content = rawContent.replace(/\/\*[\s\S]*?\*\//g, "");

  const tableBlocks = extractTableBlocks(content);
  const fksByTable = new Map<string, ForeignKeyRef[]>();

  const models: PrismaSchema.PrismaModel[] = tableBlocks.map(({ name, lines }) => {
    const { fields, indexes, fks } = parseTableBody(lines);
    fksByTable.set(name, fks);
    return { name, fields, indexes };
  });

  // Only PostgreSQL has a separate named-enum construct (`CREATE TYPE ... AS ENUM`). MySQL
  // enums are inline on the column (see `parseColumnField`'s `pseudoEnumValues`), and SQLite
  // has none, relying entirely on the `-- @enum` comment convention.
  const enums: PrismaSchema.PrismaEnum[] =
    dbType === "PostgreSql" ? parsePostgresEnumTypes(content) : [];

  const relations = buildRelations(models, fksByTable);

  const datasource: PrismaSchema.ParsedSchema["datasource"] = {
    provider: DATASOURCE_PROVIDER[dbType],
    url: "unknown",
  };

  return { models, enums, relations, datasource, generator: null, rawContent };
}
