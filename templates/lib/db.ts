import { code, imp } from "ts-poet";
import { DbProvider } from "../config/docker-compose.yml";

const Kysely = imp("Kysely@kysely");

/**
 * Kysely client singleton for pure-sql mode (the "@/lib/db" every generated sql.ts route
 * imports) — the counterpart to "@/lib/prisma" in Prisma mode. Built for exactly the database
 * provider chosen during `init`, matching how docker-compose.yml/`.env` are also built "from
 * parts" for that same choice.
 *
 * `Kysely<any>` on purpose: the generated CRUD routes address tables by a raw string (e.g.
 * `db.selectFrom("User")`), not a generated `Database` schema interface, so a typed client would
 * reject every one of those calls at compile time.
 */
export const writeDbClient = (dbProvider: DbProvider) => {
  if (dbProvider === "postgresql") {
    const PostgresDialect = imp("PostgresDialect@kysely");
    const Pool = imp("Pool@pg");
    return code`
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const dialect = new ${PostgresDialect}({
  pool: new ${Pool}({ connectionString: getDatabaseUrl() }),
});

export const db = new ${Kysely}<any>({ dialect });
`;
  }

  if (dbProvider === "mysql") {
    const MysqlDialect = imp("MysqlDialect@kysely");
    const createPool = imp("createPool@mysql2");
    return code`
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const dialect = new ${MysqlDialect}({
  pool: ${createPool}(getDatabaseUrl()),
});

export const db = new ${Kysely}<any>({ dialect });
`;
  }

  // sqlite
  const SqliteDialect = imp("SqliteDialect@kysely");
  const SqliteDatabase = imp("Database=better-sqlite3");
  return code`
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

/** \`DATABASE_URL\` for sqlite is a \`file:\` URL (e.g. "file:./dev.db") — better-sqlite3 wants a
 *  plain filesystem path. */
function sqliteFilePath(url: string): string {
  return url.startsWith("file:") ? url.slice("file:".length) : url;
}

const dialect = new ${SqliteDialect}({
  database: new ${SqliteDatabase}(sqliteFilePath(getDatabaseUrl())),
});

export const db = new ${Kysely}<any>({ dialect });
`;
};

export default writeDbClient;
