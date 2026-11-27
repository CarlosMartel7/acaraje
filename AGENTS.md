# AGENTS.md

Guidance for AI agents working on Acaraje, a CLI that generates admin panels from a Prisma or
SQL schema.

## Skills

Task-specific instructions live in [`skills/`](skills/). Read the matching skill before starting
one of these tasks:

| Skill | Use when |
|---|---|
| [`skills/versioning.md`](skills/versioning.md) | Preparing a `develop` → `master` PR, or bumping, releasing or tagging a version |

## Branches

- `develop` collects finished, reviewed work.
- `master` holds released versions. Each `develop` → `master` PR is one release
  (see [`skills/versioning.md`](skills/versioning.md)).

## Commits

Commit messages follow Conventional Commits with the area that changed most as the scope,
e.g. `feat(templates): ...`, `fix(cli): ...`. Mark breaking changes with `!`
(`feat(cli)!: ...`), because versioning depends on these prefixes.
