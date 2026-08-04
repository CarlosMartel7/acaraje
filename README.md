# Acaraje

Prisma-powered admin for Next.js: dynamic CRUD, schema browser, relations graph, seeder, and MinIO-backed Drive UI.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/acaraje/dashboard`.

Requires PostgreSQL (`DATABASE_URL`) and MinIO env vars for Drive. Local infra:

```bash
docker compose up -d
```

## Scripts

| Script | Role |
|--------|------|
| `db:generate`, `db:push`, `db:seed`, `db:studio` | Prisma |
| `storage:setup` | Ensure MinIO bucket exists |

## Layout

| Path | Role |
|------|------|
| `app/acaraje/` | Admin pages |
| `app/api/acaraje/` | API route handlers |
| `components/` | UI (sidebar, feature modules, shadcn-style primitives) |
| `lib/` | Prisma client, schema parser, storage helpers |
| `prisma/` | Schema and migrations |
