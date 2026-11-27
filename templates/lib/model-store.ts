import { code, imp } from "ts-poet";
import { DbProvider } from "../config/docker-compose.yml";

const prisma = imp("prisma@@/lib/prisma");
const db = imp("db@@/lib/db");

/**
 * "@/lib/model-store": the record operations the Stats and Seeder screens need, addressed by
 * schema model name, for whichever database client the project was generated with. Stats and
 * Seeder (REST routes and tRPC routers alike) import only this module, never "@/lib/prisma" or
 * "@/lib/db" directly, so they work unchanged in both Prisma and pure-SQL projects.
 *
 * Every function throws when the operation fails; callers decide how to report it.
 */
export const writeModelStore = (orm: "prisma" | "pure-sql", dbProvider?: DbProvider) => {
  if (orm === "prisma") {
    return code`
/** Prisma Client exposes each model's delegate under its lowerCamel name (e.g. \`prisma.user\`
 *  for model \`User\`) regardless of the PascalCase model name used everywhere else. */
function delegateFor(modelName: string) {
  const delegate = (${prisma} as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
  if (!delegate) throw new Error(\`Prisma Client has no delegate for model "\${modelName}"\`);
  return delegate;
}

export async function countRecords(modelName: string): Promise<number> {
  return delegateFor(modelName).count();
}

export async function sampleRecords(modelName: string, take: number): Promise<Record<string, unknown>[]> {
  return delegateFor(modelName).findMany({ take });
}

export async function createRecord(modelName: string, data: Record<string, unknown>): Promise<void> {
  await delegateFor(modelName).create({ data });
}
`;
  }

  if (!dbProvider) throw new Error('writeModelStore("pure-sql") needs the database provider');

  // better-sqlite3 can only bind numbers, strings, bigints, buffers and null, so dates and
  // booleans are stored the way SQLite itself represents them. pg and mysql2 bind both natively.
  const toDriverValue =
    dbProvider === "sqlite"
      ? code`
function toDriverValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}`
      : code`
function toDriverValue(value: unknown): unknown {
  return value;
}`;

  return code`
${toDriverValue}

/** In pure-SQL mode each schema model is a table of the same name (see sql-parser.ts). */
export async function countRecords(modelName: string): Promise<number> {
  const row: { count?: number | string | bigint } | undefined = await ${db}
    .selectFrom(modelName)
    .select((eb: any) => eb.fn.countAll().as("count"))
    .executeTakeFirst();
  return Number(row?.count ?? 0);
}

export async function sampleRecords(modelName: string, take: number): Promise<Record<string, unknown>[]> {
  return ${db}.selectFrom(modelName).selectAll().limit(take).execute();
}

/** A plain insert, without RETURNING, which MySQL doesn't support. */
export async function createRecord(modelName: string, data: Record<string, unknown>): Promise<void> {
  const values = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toDriverValue(value)]));
  await ${db}.insertInto(modelName).values(values).execute();
}
`;
};

export default writeModelStore;
