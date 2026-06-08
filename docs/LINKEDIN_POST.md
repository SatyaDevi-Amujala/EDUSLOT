# LinkedIn Post — EduSlot

> Attach `docs/architecture.svg` (exported as PNG) as the post image.
> Tip to export: open `docs/architecture.svg` in Chrome → take a full-page
> screenshot, or use any "SVG to PNG" online tool.

---

## Option A — Story style (recommended)

🎓 I built **EduSlot** — a full-stack, role-based **course enrollment platform**.

Most "CRUD apps" hardcode their menus and permissions. I wanted the opposite: a system where an admin creates a role, ticks a few permission boxes, and the entire UI reshapes itself — no code changes.

✅ **What it does:**
🧩 Microservices backend (API gateway + 3 Express services) and micro-frontends (React + Module Federation) that share one UI kit at runtime
🔐 JWT auth (bcrypt) with signup/login
🛂 Fully dynamic RBAC — roles → page- & action-level permissions, enforced on BOTH the client and every API route
🗂️ A database-driven sidebar (self-referencing pages table) — add a page, zero frontend changes
🪑 Seat-based course enrollment with live "seats remaining" and row-locked capacity checks (no overselling)
📖 Swagger/OpenAPI docs for every service
🐳 Fully containerized with Docker Compose

🛠️ Stack: React, Node.js, Express, PostgreSQL, JWT, Tailwind, Module Federation, Swagger, Docker.

The most satisfying part: one `pages → roles → permissions` schema drives the navigation, the visible pages, AND the buttons each user can click.

Always learning and building — more to come. 🚀

#fullstack #react #nodejs #postgresql #microservices #docker #webdevelopment #softwareengineering

---

## Option B — Punchy / concise

🚀 Built **EduSlot** — a role-based course enrollment platform.

The idea: a fully **dynamic admin system**. Create a role, grant page/action permissions, and the sidebar + pages + buttons rebuild themselves from the database. Authorization is enforced on the client *and* every API route.

✅ Microservices + micro-frontends (Module Federation)
✅ JWT auth + dynamic RBAC
✅ Database-driven navigation
✅ Seat-safe enrollment (no overselling)
✅ Swagger API docs
✅ Dockerized with Docker Compose

🛠️ React · Node · Express · PostgreSQL · Tailwind · Docker

Would love your thoughts. 👇

#fullstack #react #nodejs #microservices #docker

---

## Posting tips
- LinkedIn shows ~3 lines before "…see more" — the first 2 lines matter most. Both options front-load the hook.
- Put the **architecture image** as the single attached image (square-ish/portrait images get more screen space on mobile).
- Add your GitHub repo link **in the first comment** (not the body) — LinkedIn down-ranks posts with outbound links in the body.
- End with a question/CTA to invite comments.
