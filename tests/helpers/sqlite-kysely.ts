import { Kysely, SqliteDialect } from "kysely";

/**
 * A real Kysely client over an in-memory SQLite database, built on Node's own `node:sqlite` so
 * tests need no native module. Like better-sqlite3 (what generated pure-SQL SQLite apps use),
 * `node:sqlite` only binds numbers, strings, bigints, buffers and null, so value-binding bugs
 * reproduce here the same way they do in a generated panel.
 */
export function createSqliteKysely(schemaSql: string): { db: Kysely<any>; close: () => void } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require("node:sqlite");
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schemaSql);

  const database = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        reader: statement.columns().length > 0,
        all: (params: readonly unknown[]) => statement.all(...params),
        run: (params: readonly unknown[]) => statement.run(...params),
        iterate: (params: readonly unknown[]) => statement.iterate(...params),
      };
    },
    close() {
      sqlite.close();
    },
  };

  const db = new Kysely<any>({ dialect: new SqliteDialect({ database: database as any }) });
  return { db, close: () => sqlite.close() };
}
