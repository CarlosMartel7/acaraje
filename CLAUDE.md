# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

There is also an `AGENTS.md` in the repo root — read it too; it covers tech stack, environment
variables, and repo layout in more detail. This file focuses on commands and the architectural
patterns that span multiple files.

## Commands

```bash
npm install
npx prisma generate        # regenerate Prisma Client after schema.prisma changes
npm run dev                 # http://localhost:3000 → redirects to /acaraje/dashboard
npm run build
npm run lint
npx tsc --noEmit             # typecheck only, no build (fast check while editing)
```

Database / storage:

```bash
npm run db:generate         # prisma generate
npm run db:push             # push prisma/schema.prisma to DATABASE_URL, no migration files
npm run db:seed              # tsx prisma/seed.ts (faker-based)
npm run db:studio            # Prisma Studio
npm run storage:setup        # ensure MinIO bucket exists (scripts/setup-storage-bucket.ts)
docker compose up -d         # local Postgres + MinIO
```

There is no test suite configured in this repo — verification is `tsc --noEmit`, `npm run lint`,
and manually exercising the feature via `npm run dev` (see AGENTS.md's verification checklist).

## Architecture

### The app is schema-driven, not model-specific

Almost nothing here is hardcoded per-Prisma-model. Instead, three pieces work together to make the
admin generic:

- **`lib/schema-parser.ts`** (`parseSchema()`) — reads `prisma/schema.prisma` as text and parses it
  into `PrismaSchema.ParsedSchema` (models, fields, enums, relations) without needing a DB
  connection. This is what the schema browser, relations graph, and CRUD form generation all read.
- **`lib/prisma-delegate.ts`** (`getDelegate(modelName)`) — turns a PascalCase model name from a URL
  segment (e.g. `"Product"`) into the corresponding lowercase Prisma Client delegate
  (`prisma.product`), via simple first-letter lowercasing. This is the only place model-name → 
  delegate resolution happens; any new generic route should reuse it rather than re-deriving.
- **`app/api/acaraje/crud/[model]/**`** — one dynamic route handles list/create/delete
  (`route.ts`), get/update/delete-one (`[id]/route.ts`), and relation-picker options
  (`options/route.ts`) for *every* model, driven by `getDelegate` + `parseSchema`. `global.d.ts`'s
  `Schema.*` namespace is the shared shape these routes and the frontend agree on.

When adding admin functionality, prefer extending this generic layer over writing per-model code.

### Ambient types live in one place: `global.d.ts`

There is no per-feature `types.ts`. `global.d.ts` declares one `namespace` per service area (`Drive`,
`Storage`, `Schema`, `Dashboard`, `PrismaSchema`, `Relations`, `Boards`, `Crud`, `Ui`) as **ambient**
ambient types — they're used directly as `Schema.Model`, `Boards.WidgetConfig`, etc. with no import.
When changing a feature's data shape, this file is almost always the first edit, and every consumer
across `app/` and `components/` needs to be checked against it afterward.

### Boards (dashboard builder) — config file, not a DB table

`app/acaraje/boards/**` + `app/api/acaraje/boards/**` implement a user-configurable dashboard of
chart widgets, backed by a flat JSON file (`acaraje.boards.json` at repo root, git-ignored, created
on first read with a default "Overview" page) rather than a Prisma model. `lib/boards-config.ts` is
the only module that reads/writes this file (`readConfig`/`writeConfig`), with CRUD-style helpers
(`createPage`, `addWidget`, `reorderWidgets`, etc.) layered on top — API routes under
`app/api/acaraje/boards/pages/` call these helpers rather than touching the file directly.

Each widget stores a `Boards.MetricSpec` (see `global.d.ts`) describing *what to compute* — model,
operation, optional grouping/filter — not the computed data. `app/api/acaraje/boards/widget-data/route.ts`
is the execution engine: it turns a `MetricSpec` into live Prisma queries via `getDelegate` +
`parseSchema`, normalizes the result to `Boards.WidgetDataResponse`, and that response is all
`components/routes/boards/widget.tsx` ever renders from — chart components branch on `chartType` only,
never on the metric shape. This metric-spec design is under active revision; check for a plan doc
under `~/.claude/plans/` before assuming the current shape in `global.d.ts` is final.

### Routing convention

Admin pages live under `/acaraje/*`, API routes under `/api/acaraje/*`. The `/acaraje` prefix is
centralized in `lib/acaraje-routes.ts` (`acarajePath()`) — use it for any new internal link instead
of hardcoding the segment.

### Storage (MinIO)

`lib/storage/` wraps MinIO behind an `ObjectStorage` interface (`Storage.ObjectStorage` in
`global.d.ts`) — `minio-storage.ts` implements it, `minio-folders.ts`/`minio-contents.ts` handle the
folder-tree emulation MinIO doesn't natively provide (it's a flat key-value store; "folders" are
inferred from key prefixes). `instrumentation.ts` ensures the configured bucket exists on server
startup.
