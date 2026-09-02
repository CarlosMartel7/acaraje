import { code } from "ts-poet";
import { DbProvider } from "./docker-compose.yml";

// kysely itself is dependency-free and lightweight enough to ship unconditionally (matching how
// @prisma/client/prisma below are also always included regardless of the ORM actually chosen);
// only the provider-specific driver differs, so that part is picked per dbProvider.
const KYSELY_DRIVER_DEPS: Record<DbProvider, Record<string, string>> = {
  postgresql: { pg: "^8.16.3" },
  mysql: { mysql2: "^3.15.3" },
  sqlite: { "better-sqlite3": "^12.6.0" },
};

const KYSELY_DRIVER_DEV_DEPS: Record<DbProvider, Record<string, string>> = {
  postgresql: { "@types/pg": "^8.15.6" },
  mysql: {},
  sqlite: { "@types/better-sqlite3": "^7.6.13" },
};

const packageJson = {
  name: "acaraje-admin",
  version: "0.1.0",
  private: true,
  scripts: {
    dev: "next dev",
    build: "next build",
    start: "next start",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
  },
  dependencies: {
    "@faker-js/faker": "^10.3.0",
    "@google-cloud/storage": "^7.21.0",
    "@lucide/lab": "^0.1.2",
    "@prisma/client": "^5.22.0",
    "@radix-ui/react-accordion": "^1.2.1",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-icons": "^1.3.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-scroll-area": "^1.2.1",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-tooltip": "^1.1.4",
    "@tanstack/charts": "^0.12.0",
    "@tanstack/react-form": "^1.33.5",
    "@tanstack/react-query": "^5.101.4",
    "@tanstack/react-table": "^9.1.2",
    "@xyflow/react": "^12.10.1",
    autoprefixer: "^10.4.27",
    "class-variance-authority": "^0.7.1",
    clsx: "^2.1.1",
    dagre: "^0.8.5",
    kysely: "^0.28.9",
    "lucide-react": "^0.577.0",
    minio: "^8.0.7",
    next: "15.0.4",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    sonner: "^2.0.7",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7",
    zod: "^4.4.3",
  },
  devDependencies: {
    "@types/dagre": "^0.7.54",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    postcss: "^8",
    prisma: "^5.22.0",
    tailwindcss: "^3.4.1",
    tsx: "^4.19.2",
    typescript: "^5",
    vitest: "^4.1.10",
  },
};

export const writePackageJson = (dbProvider: DbProvider) => {
  const withDriver = {
    ...packageJson,
    dependencies: {
      ...packageJson.dependencies,
      ...KYSELY_DRIVER_DEPS[dbProvider],
    },
    devDependencies: {
      ...packageJson.devDependencies,
      ...KYSELY_DRIVER_DEV_DEPS[dbProvider],
    },
  };

  return code`${JSON.stringify(withDriver, null, 2)}\n`;
};

export default writePackageJson;
