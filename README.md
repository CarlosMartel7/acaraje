# Acaraje

A CLI that scaffolds a full **Next.js admin panel** from a database schema you already have —
point it at a `schema.prisma` (or a raw `schema.sql`) and it generates CRUD screens, a schema
and relations viewer, a fake-data seeder, a file storage browser, and env-based auth, wired end
to end and ready to run.

## Introduction

Most admin panels start the same way: you have a database, and you need CRUD screens, basic
auth, and a way to browse/upload files — none of which is interesting to write by hand for every
new project. Acaraje reads your existing schema and generates that panel for you as real,
readable source code (not a black-box runtime), using [ts-poet](https://github.com/stephenh/ts-poet)
template generators under the hood.

Two schema sources are supported:

- **Prisma** — point it at your `schema.prisma`; the datasource provider (`postgresql`, `mysql`,
  or `sqlite`) is read straight from the file.
- **Pure SQL** — point it at a raw `schema.sql` for PostgreSQL, MySQL, or SQLite; routes are
  generated against [Kysely](https://kysely.dev/) instead of Prisma.

The generated app comes with:

- A **dashboard** summarizing your schema (model/field/relation counts, field-type distribution).
- **CRUD** — a searchable, filterable, sortable table per model, plus create/edit forms with
  per-field-type inputs (relations render as a searchable picker, enums as a select, etc.).
- A **schema viewer** (models, fields, enums) and a **relations** view grouping every
  one-to-one / one-to-many / many-to-one / many-to-many relation by model.
- A **seeder** panel to generate fake data per model via `@faker-js/faker`, with per-field rules.
- A **drive** page to browse/upload/delete files against MinIO or Google Cloud Storage.
- Single-account **auth** (env-configured username/password, signed session cookie) — no user
  table, no external auth provider.

## Quickstart

### Prerequisites

- Node.js 18.18+ and npm
- A project directory that already has your schema in place:
  - Prisma mode: `<project>/prisma/schema.prisma`
  - Pure SQL mode: `<project>/database/schema.sql`
- Docker (optional — only needed if you want the generated `docker-compose.yml` for local
  Postgres/MySQL/MinIO/GCS-emulator services)

### Install the CLI

Acaraje isn't published to npm yet, so build and link it locally:

```bash
git clone git@github.com:CarlosMartel7/acaraje.git
cd acaraje
npm install
npm run build
npm link          # exposes the `create-acaraje` command globally
```

### Generate a panel

`cd` into your project (the one with `/prisma` or `/database` already in it) and run:

```bash
create-acaraje
```

You'll be asked:

| Prompt | What it controls | Default |
| --- | --- | --- |
| Panel name | Route segment the admin UI is mounted under (`app/<name>/...`) | `Acaraje` |
| ORM | `prisma` or `pure-sql` (Kysely) | — |
| Database provider *(pure-sql only)* | `postgresql`, `mysql`, or `sqlite` | — |
| Schema location | Folder holding `schema.prisma` / `schema.sql` | `/prisma` or `/database` |
| Storage | `minio` or `gcs` | — |
| Use Docker locally? | Whether to also write `docker-compose.yml` | — |
| Initialize the database now? *(prisma only)* | Runs `npx prisma db push` after generation | Yes |
| Username / Password | Admin login for the generated panel | `admin` / `password` |

Acaraje then generates the app in place, runs `npm install` for you and, in Prisma mode,
`prisma generate` (and `prisma db push`, if you said yes above).

### Run it

```bash
npm run dev
```

Visit `http://localhost:3000/acaraje` (or `/<your-panel-name>`, see
[Known limitations](#known-limitations)) and log in with the username/password you chose.

## Dashboard Technologies

The generated admin panel is a standalone app — none of this is a dependency of the CLI itself:

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, Radix UI primitives, `class-variance-authority`, `lucide-react` icons |
| Data fetching | TanStack Query |
| Tables & forms | TanStack Table, TanStack Form |
| Validation | Zod |
| ORM / DB access | Prisma **or** Kysely (raw SQL), depending on the ORM you chose |
| File storage | MinIO (S3-compatible) or Google Cloud Storage |
| Fake data | `@faker-js/faker` |
| Auth | Signed session cookie, env-configured single admin account |
| Notifications | Sonner |
| Testing | Vitest |

The CLI itself is a small Node/TypeScript tool built on `commander` (argument parsing),
`@clack/prompts` (interactive prompts), `ts-poet` (typed code generation), and `zod`
(prompt-answer validation), bundled with `tsup`.

## Project Structure

```
src/
  commands/init.ts       interactive prompt flow, orchestrates every generation step
  steps/                 one generate-*.ts per concern (folders, CRUD, auth, storage, ...)
  steps/prisma-parser.ts parses schema.prisma into a ParsedSchema
  steps/sql-parser.ts    parses raw schema.sql into the same ParsedSchema shape
templates/                every generated file, as a ts-poet template (mirrors the output tree)
tests/                    one test file per generate-*.ts step, run against real rendered output
```

Each `templates/**` file exports a `write*()` function that returns rendered source; each
`src/steps/generate-*.ts` calls the write functions for its area and writes real files to disk.
`src/commands/init.ts` runs every step in sequence after collecting the prompt answers.

## Environment Variables

See [`.env.example`](.env.example) at the repo root — most of those variables belong to the
*generated* project (copy them into its own `.env`, which `create-acaraje` also generates for
you pre-filled with the credentials and storage settings you chose). The one CLI-development
variable is `TEST_LOG_TYPE`, which controls how `tests/logger.ts` records generator test output
(`json` | `folder` | `no-logs`).

## Testing

```bash
npm test
```

Runs the Jest suite: every `generate-*.ts` step is rendered to a temp directory and the real
output is asserted against (content, not just file existence).

## Known Limitations

This is an actively developed project — a few gaps are worth knowing about before you rely on
generated output:

- **Custom panel names break in-app navigation.** Pages are generated under `app/<sanitized
  name>/...`, but the client-side route helper (`lib/acaraje-routes.ts`) always links to
  `/acaraje/...`. Keep the default panel name ("Acaraje") until this is fixed, or the sidebar
  links will 404.
- **Pure SQL / Kysely mode is incomplete.** Generated CRUD routes import a `@/lib/db` Kysely
  client that isn't generated yet, and `kysely` isn't added to the generated `package.json`'s
  dependencies.
- **A few `package.json` scripts reference files that aren't generated yet**: `db:seed`
  (`prisma/seed.ts`), and the `predb:*` / `storage:setup` scripts (`scripts/select-schema.ts`,
  `scripts/setup-storage-bucket.ts`).
- **`app/<panel>/boards/` is scaffolded but unused** — reserved for a future dashboard-widgets
  feature, not wired up yet.

## License

ISC — see the `license` field in [`package.json`](package.json).
