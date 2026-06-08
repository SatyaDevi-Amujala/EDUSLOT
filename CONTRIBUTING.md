# Contributing

Thanks for your interest! This project is primarily a portfolio/learning build,
but issues and PRs are welcome.

## Local setup
See the [README](README.md) → *Getting Started*. In short:
```bash
cp .env.example .env      # set DB creds
node db/migrate.js && node db/seed.js && node db/seed_rbac.js
```

## Branching
- Branch from `main`: `feat/<topic>` or `fix/<topic>`.
- One logical change per PR; keep commits focused.

## Code style
- Match the surrounding code (2-space indent; keep it consistent with neighbours).
- Backend: CommonJS Express services. Frontend: React function components + hooks.
- Keep the shared UI kit (`frontend/shell-app/src/ui`) framework-agnostic and reusable.

## Before opening a PR
- Run each affected service and click through the related page.
- For schema changes, update `db/schema.sql`, the seeds, and `docs/DATABASE.md`.
- For new endpoints, update `docs/API.md`.
