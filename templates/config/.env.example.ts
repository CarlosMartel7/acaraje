import { code } from "ts-poet";

export const writeEnvExample = () => code`
# Which prisma/schema.<provider>.prisma variant \`npm run db:generate|db:push|db:studio\` selects
# (via scripts/select-schema.ts, run automatically as a \`pre*\` hook). One of: postgresql | mysql | sqlite.
# Force a specific variant regardless of this value with \`npm run db:use:<provider>\`.
DATABASE_PROVIDER=postgresql

# DATABASE_URL — pick the one matching DATABASE_PROVIDER above, comment out the others.

# postgresql (matches docker-compose's \`postgres\` service)
DATABASE_URL="postgresql://postgres:password@localhost:5433/acaraje_dev?schema=public"

# mysql (matches docker-compose's \`mysql\` service)
# DATABASE_URL="mysql://root:password@localhost:3307/acaraje_dev"

# sqlite (file-based, no docker service needed; prisma/*.db is gitignored)
# DATABASE_URL="file:./dev.db"

NODE_ENV=development

# Admin panel login (env-only — no Prisma auth models)
ACARAJE_ADMIN_USERNAME=admin
ACARAJE_ADMIN_PASSWORD=change-me
# Generate with: openssl rand -base64 32
ACARAJE_AUTH_SECRET=

# MinIO — matches docker-compose defaults
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=acaraje-dev

# GCS — only read when scripts/storage-settings.ts sets CURRENT_STORAGE_PROVIDER = "gcs".
GCS_PROJECT_ID=acaraje-dev
GCS_BUCKET=acaraje-dev
# Local emulator only (fake-gcs-server via \`docker compose up -d fake-gcs-server\`). Omit for real GCS.
GCS_API_ENDPOINT=http://localhost:4443
# Real GCS auth uses Application Default Credentials — point this at a service-account JSON key
# (files matching *-service-account*.json are gitignored) or omit when running on GCP infra with
# an attached service account.
# GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/acaraje-service-account.json
`;

export default writeEnvExample;
