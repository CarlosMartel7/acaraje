# Acaraje

Prisma-powered admin for Next.js: dynamic CRUD, schema browser, relations graph, seeder, and MinIO-backed Drive UI.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/acaraje/dashboard` (login required).

Requires PostgreSQL (`DATABASE_URL`), admin auth env vars, and MinIO env vars for Drive. Local infra:

```bash
docker compose up -d
```

## Authentication

Admin login is **env-based** — no auth models in your Prisma schema.

| Variable | Purpose |
|----------|---------|
| `ACARAJE_ADMIN_USERNAME` | Login username |
| `ACARAJE_ADMIN_PASSWORD` | Login password |
| `ACARAJE_AUTH_SECRET` | Signs the session cookie (`openssl rand -base64 32`) |

Defaults in `.env.example` are for local development. Change them before deploying:

1. Set new username/password in `.env` (or your host’s secret store)
2. Rotate `ACARAJE_AUTH_SECRET` to invalidate existing sessions
3. Restart the app

Sign in at `/login`. Sign out from the sidebar footer.

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
