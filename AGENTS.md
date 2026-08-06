# Acaraje — developer & agent handover

This document orients anyone (human or coding agent) working on **Acaraje**: a **Next.js App Router** admin UI for **Prisma** schemas.

---

## What this repository is

**Root app (`acaraje-admin`)**: dynamic CRUD, schema browser, relations graph (React Flow + Dagre), faker-based seeder API/UI, and a **MinIO**-backed Drive (upload + browse).

Admin **pages** live under **`/acaraje/*`**. **API handlers** live under **`/api/acaraje/*`**. The segment `/acaraje` is centralized in `lib/acaraje-routes.ts` (`ACARAJE_BASE`, `acarajePath()`).

---

## Tech stack (authoritative)

| Area | Choice |
|------|--------|
| Framework | Next.js **15** (App Router) |
| UI | React **19**, Tailwind **3**, Radix UI, shadcn-style components in `components/ui/` |
| Data | Prisma **5**, PostgreSQL / SQLite / MongoDB (`DATABASE_PROVIDER` + `DATABASE_URL`) |
| Storage | `minio` client; Drive APIs under `app/api/acaraje/drive/` |

**Note:** `next-auth` appears in root `package.json` but is **not referenced** in application code. Treat it as unused or reserved; the admin surface has **no built-in authentication** — do not expose it publicly without adding your own auth (e.g. middleware, reverse proxy).

---

## Repository layout

| Path | Role |
|------|------|
| `app/acaraje/**` | Admin pages (dashboard, CRUD, schemas, relations, seeder, drive) |
| `app/api/acaraje/**` | Route handlers for stats, CRUD, schemas, seed, relations, drive |
| `components/` | Sidebar, shared UI, feature modules under `components/routes/` |
| `lib/` | Prisma singleton, schema parser, storage helpers, `acaraje-routes.ts` |
| `prisma/schema.prisma` | Example/host schema; parser expects default path (customize `lib/schema-parser.ts` if needed) |
| `instrumentation.ts` | Optional: ensures MinIO bucket exists on Node server startup (see Next.js instrumentation) |

---

## Local development (this repo)

```bash
npm install
npx prisma generate   # if needed
npm run dev             # http://localhost:3000 → redirects to /acaraje/dashboard
```

Useful scripts from root `package.json`:

- `db:generate`, `db:push`, `db:seed`, `db:studio` — Prisma
- `storage:setup` — storage bucket helper (`scripts/setup-storage-bucket.ts`)

---

## Environment variables

- **`DATABASE_URL`** — required for Prisma.
- **`DATABASE_PROVIDER`** — `postgresql` (default) | `sqlite` | `mongodb`. Selects which
  `prisma/schema.<provider>.prisma` variant `db:generate`/`db:push`/`db:studio` copy over
  `prisma/schema.prisma` before running (via `scripts/select-schema.ts`, wired in as a `pre*` npm
  hook). See `.env.example`.
- **MinIO** (Drive) — see `lib/storage/config.ts`. Typical vars: `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`.

---

## Switching database providers

Three schema variants live in `prisma/`: `schema.postgresql.prisma`, `schema.sqlite.prisma`,
`schema.mongodb.prisma`. `prisma/schema.prisma` is whichever one is currently selected (committed
equal to the postgresql variant, so a fresh clone needs no extra steps).

```bash
npm run db:use:postgresql    # or db:use:sqlite / db:use:mongodb — force a variant
npm run db:generate          # auto-selects from DATABASE_PROVIDER first, then `prisma generate`
```

Caveats: SQLite has no `enum` keyword, so its variant encodes the 6 enum fields as `String` with a
trailing `// @enum A | B | C` comment (`lib/schema-parser.ts` parses this into
`pseudoEnumValues`, consumed via `lib/enum-values.ts`'s `getEnumValues()`); SQLite search/filter is
case-sensitive (Prisma's `mode: "insensitive"` isn't supported there); Mongo needs a replica set
(`docker compose up -d mongo mongo-init`) since its Prisma connector requires transactions. The
SQLite variant's choice to keep bare `Decimal` on the 12 money fields (rather than `Float`) has not
been verified with `npx prisma validate` in this environment — do that before relying on it.

---

## Conventions for agents editing code

- **Imports**: `@/*` maps to repo root (see `tsconfig.json`). Match existing patterns in `components/` and `lib/`.
- **New admin links**: use `acarajePath("/segment")` from `lib/acaraje-routes.ts` so the `/acaraje` prefix stays consistent.
- **CRUD**: Dynamic routes under `app/acaraje/crud/[model]/`; model names align with Prisma **PascalCase** model names. UI logic lives in `components/routes/crud/[model]/`.
- **API**: Extend `app/api/acaraje/` and keep paths parallel to features (CRUD, schemas, drive, …).

---

## Verification checklist

1. `npm run dev` — home redirects to `/acaraje/dashboard`.
2. Sidebar loads model list from `/api/acaraje/schemas`.
3. CRUD: `/acaraje/crud/<ModelName>` matches a Prisma model.

---

## Further reading in-repo

- **`README.md`** — quick start and layout.

---

*Last oriented for the repository layout with admin under `/acaraje/*` and API under `/api/acaraje/*`.*
