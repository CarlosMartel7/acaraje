import { code } from "ts-poet";
import { DbProvider, StorageProvider } from "./docker-compose.yml";

const DATABASE_URLS: Record<DbProvider, string> = {
  postgresql: `postgresql://postgres:password@localhost:5433/acaraje_dev?schema=public`,
  mysql: `mysql://root:password@localhost:3307/acaraje_dev`,
  sqlite: `file:./dev.db`,
};

const MINIO_ENV = `MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=acaraje-dev`;

const GCS_ENV = `GCS_PROJECT_ID=acaraje-dev
GCS_BUCKET=acaraje-dev
GCS_API_ENDPOINT=http://localhost:4443`;

/**
 * Real, working .env — unlike .env.example, this carries the credentials the user actually chose
 * during `init` plus a freshly generated ACARAJE_AUTH_SECRET, so the generated project runs as-is.
 */
export const writeEnvFile = (
  dbProvider: DbProvider,
  storage: StorageProvider,
  username: string,
  password: string,
  authSecret: string,
) => {
  const storageEnv = storage === "minio" ? MINIO_ENV : GCS_ENV;

  const body = `DATABASE_PROVIDER=${dbProvider}

DATABASE_URL="${DATABASE_URLS[dbProvider]}"

NODE_ENV=development

# Admin panel login (env-only — no Prisma auth models)
ACARAJE_ADMIN_USERNAME=${username}
ACARAJE_ADMIN_PASSWORD=${password}
ACARAJE_AUTH_SECRET=${authSecret}

${storageEnv}
`;

  return code`${body}`;
};

export default writeEnvFile;
