# Acaraje

A CLI that scaffolds a full **Next.js admin panel** from a database schema you already have —
point it at a `schema.prisma` (or a raw `schema.sql`) and it generates CRUD screens, a schema
and relations viewer, a fake-data seeder, a file storage browser, and env-based auth, wired end
to end and ready to run.

> Attention
> Read [Warnings and Considerations](#warnings-and-considerations) before generating the admin panel.

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

## Warnings and Considerations

**Acaraje generates a starting point, not a finished product.** What comes out of
`create-acaraje` is an editable source code meant to be a one-click tool for database manipulation in local development, and later to be adapted to your project's needs — not something to publish as-is.

A few specific things worth knowing:

- **Auth is env-based on purpose, and it's minimal.** There's no user table and no external auth   provider — a single admin account, configured entirely through `ACARAJE_ADMIN_USERNAME` /  `ACARAJE_ADMIN_PASSWORD` / `ACARAJE_AUTH_SECRET` in `.env`. That was a deliberate choice: it keeps you in full control of your own database and credentials instead of wiring a third-party identity provider into your schema for you.  **We
  strongly recommend**  replacing the current method of saving credentials with proper auth before any
  real use before exposing the panel to anyone but yourself.
- **Default/local credentials everywhere else, too.** The generated `docker-compose.yml` uses
  fixed, well-known credentials and ports for Postgres/MySQL/MinIO — fine for a local dev loop,
  not for anything shared or reachable outside your machine.
- **No authorization model beyond "logged in or not."** The CRUD, drive, and seeder routes trust
  any authenticated session completely. If your real project needs per-model permissions, field-
  level restrictions, audit logging, or soft deletes, that's on you to add — it isn't generated.

In short: use Acaraje to skip the boring part of standing up an admin panel, then treat the
result as your own codebase to secure and extend, not a managed product.

## Quickstart

### Prerequisites

- Node.js 18.18+ and npm
- A project directory that already has your schema in place:
  - Prisma mode: `<project>/prisma/schema.prisma`
  - Pure SQL mode: `<project>/database/schema.sql`
- Docker (optional — only needed if you want the generated `docker-compose.yml` for a local development environment)

### Install the CLI

In your directory that has your schemas in place run:

```bash
npx acaraje init
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
| Username / Password | Admin login for the generated panel | `admin` / `password` |

Acaraje then generates the app in place, runs `npm install` for you and, in Prisma mode,
`prisma generate`

**Note:** `Username` and `Password` are stored in the generated `.env` file rather than in the database, so they don't require fields that may be unnecessary for your database schema.

### Run it

```bash
docker compose up -d # If you opted to use docker for development
npm run dev
```

Visit `http://localhost:3000/login` and log in with the username/password you chose.

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

## Environment Variables

See [`.env.example`](.env.example) at the repo root — most of those variables belong to the
*generated* project (copy them into its own `.env`, which `create-acaraje` also generates for
you pre-filled with the credentials and storage settings you chose).

## Known Limitations

This is an actively developed project — a few gaps are worth knowing about before you rely on
generated output:

- **A few `package.json` scripts reference files that aren't generated yet**: `db:seed`
  (`prisma/seed.ts`), and the `predb:*` / `storage:setup` scripts (`scripts/select-schema.ts`,
  `scripts/setup-storage-bucket.ts`).

## License

ISC — see the `license` field in [`package.json`](package.json).
