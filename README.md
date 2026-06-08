# 🎓 EduSlot — Course / Class Enrollment Platform

A full-stack, **role-based course enrollment system** built with a **microservices** backend and a **micro-frontend** frontend. Admins manage masters (states, campuses, categories, instructors, courses), define **roles with page-level permissions**, and create users — while students sign up and **enroll into limited course seats**.

> Everything is **dynamic and permission-driven**: the sidebar, the pages a user sees, and the actions they can perform (add / edit / delete / status / download) are all computed at runtime from the database — no hardcoded menus.

---

## ✨ Key Features

- 🔐 **JWT authentication** — bcrypt-hashed passwords, signup/login, 8h tokens.
- 🧩 **Dynamic RBAC** — create unlimited roles and grant per-page, per-action permissions via a visual matrix. Enforced on **both** the UI and every API route.
- 🗂️ **Dynamic sidebar** — menu built from a `pages` table (self-referencing parent → child), so adding a page needs **zero frontend changes**.
- 🏢 **Masters CRUD** — States, Campuses, Categories, Instructors, Courses (with day/time + seat capacity).
- 🔗 **Business rules** — unique state/campus/course codes; **a campus belongs to only one state**.
- 🪑 **Seat-based enrollment** — students browse courses with **live seats-remaining**, enroll into a seat, and drop to free it. Capacity + double-enrollment guarded with a row lock (no overselling).
- 👤 **Self-service** — new signups become a `Student` automatically (enroll-only); existing users see exactly what their role allows.
- 📖 **Swagger / OpenAPI docs** — interactive API docs per service, aggregated at the gateway `/docs`.
- 🎨 **Custom UI kit** — hand-built Input, Single/Multi Select, DataTable, Pagination, Modal, Confirm dialog, Status toggle, Toasts — shared across micro-frontends via Module Federation.
- 🗑️ **Soft deletes + status toggles** on every entity.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, **Module Federation**, React Router, Tailwind CSS |
| **Backend** | Node.js, Express (3 microservices + API gateway) |
| **Database** | PostgreSQL |
| **Auth** | JWT (HS256) + bcrypt |
| **Docs** | Swagger UI / OpenAPI 3 |
| **Infra** | Docker / docker-compose (optional) — runs natively too |

---

## 🏗️ Architecture

```
                              Browser
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │   Shell App (5000)            │  ← TopBar + dynamic Sidebar
                  │   owns auth + permissions     │     + shared UI kit (shell/ui)
                  └───────┬───────────────┬───────┘
            loads remote  │               │  loads remote
                          ▼               ▼
              Admin App (5004)      Enroll App (5002)
              Masters · Roles ·     Browse Courses ·
              Users                 My Enrollments
                          │               │
                          └───────┬───────┘
                                  ▼  all API calls
                          API Gateway (3000)  ── /docs (aggregated Swagger)
              ┌───────────────────┼────────────────────┐
              ▼                    ▼                     ▼
       User Service          Master Service        Enrollment Service
          (4001)                (4003)                 (4002)
   auth · roles · pages   states · campuses ·    courses (live seats) ·
   · permissions · users  categories ·           enrollments
                          instructors · courses
              └───────────────────┼────────────────────┘
                                  ▼
                          PostgreSQL (ProjectA)
```

**How permissions flow:** on login the shell calls `GET /auth/permissions`, which returns the user's visible page tree + action flags. The shell builds the sidebar and shows/hides action buttons; every backend route is **independently** guarded by `requirePermission(route, action)`, so the API is safe even if the UI is bypassed.

---

## 👥 Roles (seeded)

| Role | Can do |
|---|---|
| **Administrator** | Everything: all masters, roles + permissions, users, enrollments |
| **Campus Manager** | Manage masters + view enrollments (no role/user admin) |
| **Student** | Browse courses + manage own enrollments only |

---

## 📁 Project Structure

```
eduslot/
├── backend/
│   ├── api-gateway/        # Express reverse proxy + aggregated /docs
│   ├── user-service/       # auth, roles, pages, permissions, users
│   ├── master-service/     # states, campuses, categories, instructors, courses
│   └── enrollment-service/ # course browse + enrollments (live seats)
├── frontend/
│   ├── shell-app/          # host: auth, sidebar, topbar, shared UI kit
│   ├── admin-app/          # remote: Masters, Role Mgmt, User Mgmt
│   └── enroll-app/         # remote: Browse Courses, My Enrollments
├── db/
│   ├── schema.sql          # all tables (idempotent)
│   ├── migrate.js          # create DB + apply schema (no psql needed)
│   ├── seed.js             # seed users
│   └── seed_rbac.js        # seed pages, roles, permissions, masters
├── docs/                   # DATABASE.md, API.md, architecture poster
├── setup.ps1 / start.ps1   # one-command setup / run (no Docker)
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**
- **PostgreSQL** running locally on `:5432`

### 1. Configure
```bash
cp .env.example .env        # then edit DB_USER / DB_PASSWORD
```

### 2. One-command setup (Windows / PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```
Installs deps, **creates the database + tables**, seeds demo data, builds the frontends.

<details>
<summary>Manual setup (any OS)</summary>

```bash
cd db && npm install && cd ..
for s in api-gateway user-service enrollment-service master-service; do (cd backend/$s && npm install); done
for f in shell-app admin-app enroll-app; do (cd frontend/$f && npm install); done

node db/migrate.js && node db/seed.js && node db/seed_rbac.js

for f in shell-app admin-app enroll-app; do (cd frontend/$f && npm run build); done
```
</details>

### 3. Run

**Windows (one command):**
```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

**Manual (7 terminals):**
```bash
cd backend/user-service    && node src/index.js   # :4001
cd backend/enrollment-service && node src/index.js   # :4002
cd backend/master-service  && node src/index.js   # :4003
cd backend/api-gateway     && node src/index.js   # :3000
cd frontend/shell-app   && npm run preview         # :5000  ← open this
cd frontend/admin-app   && npm run preview         # :5004
cd frontend/enroll-app && npm run preview           # :5002
```

### 4. Open
👉 **http://localhost:5000** · API docs at **http://localhost:3000/docs**

| Login | Role | Sees |
|---|---|---|
| `admin@example.com` / `password123` | Administrator | Everything |
| `manager@example.com` / `password123` | Campus Manager | Masters + Enrollments |
| `alice@example.com` / `password123` | Student | Browse + My Enrollments |
| *sign up* | Student (auto) | Enroll-only |

> Open **5000 only** — the remotes (5002/5004) are loaded *inside* the shell and look blank on their own (by design).

---

## 🔌 Ports

| Service | URL |
|---|---|
| **Shell (open this)** | http://localhost:5000 |
| Admin remote | http://localhost:5004 |
| Enroll remote | http://localhost:5002 |
| API Gateway | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:3000/docs |
| User Service | http://localhost:4001 |
| Enrollment Service | http://localhost:4002 |
| Master Service | http://localhost:4003 |
| PostgreSQL | localhost:5432 / `ProjectA` |

---

## 🗺️ Roadmap

This is built as a multi-week engineering showcase. Done so far: foundation, JWT auth, full RBAC admin panel, masters, seat-based enrollment, Swagger docs. Planned next: Redis caching of live seat counts, RabbitMQ enrollment notifications, WebSockets for real-time seats, observability (Prometheus/Grafana), CI/CD, and Kubernetes. See [PLAN.md](PLAN.md).

---

## 📚 More docs
- [docs/DATABASE.md](docs/DATABASE.md) — full schema reference
- [docs/API.md](docs/API.md) — endpoint reference
- [docs/architecture.svg](docs/architecture.svg) — architecture poster

## 📄 License
MIT — see [LICENSE](LICENSE).
