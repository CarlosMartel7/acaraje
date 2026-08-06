import fs from "fs";
import path from "path";

const VALID_PROVIDERS = ["postgresql", "sqlite", "mongodb"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

const provider = (process.argv[2] || process.env.DATABASE_PROVIDER || "postgresql") as Provider;

if (!VALID_PROVIDERS.includes(provider)) {
  console.error(`Unknown DATABASE_PROVIDER "${provider}" — expected one of: ${VALID_PROVIDERS.join(", ")}`);
  process.exit(1);
}

const prismaDir = path.join(process.cwd(), "prisma");
const source = path.join(prismaDir, `schema.${provider}.prisma`);
const dest = path.join(prismaDir, "schema.prisma");

if (!fs.existsSync(source)) {
  console.error(`Schema variant not found: ${source}`);
  process.exit(1);
}

fs.copyFileSync(source, dest);
console.log(`prisma/schema.prisma <- schema.${provider}.prisma`);
