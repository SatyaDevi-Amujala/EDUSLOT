# API Reference — EduSlot

All requests go through the **API Gateway** at `http://localhost:3000`, which
proxies to the appropriate microservice. All routes except `/auth/*` require an
`Authorization: Bearer <token>` header.

**Interactive docs:** open **http://localhost:3000/docs** (links to each service's
Swagger UI). Raw OpenAPI specs are at `<service>/openapi.json`.

## Auth — `user-service`

| Method | Route | Description |
|---|---|---|
| POST | `/auth/signup` | Register; new users get the `Student` role. Returns `{ token, user }`. |
| POST | `/auth/login` | Returns `{ token, user }`. |
| GET | `/auth/me` | Current user. |
| GET | `/auth/permissions` | **Visible page tree + action flags** — powers the dynamic sidebar. |

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

## Roles / Pages / Users — `user-service`

| Method | Route | Permission |
|---|---|---|
| GET/POST | `/roles` | view / add `/roles` |
| GET/PUT/DELETE | `/roles/:id` | view / edit / delete |
| PATCH | `/roles/:id/status` | status |
| GET/POST/PUT/DELETE | `/pages` … | admin |
| GET | `/users?page=&limit=&search=&status=` | view `/users` |
| POST/PUT/DELETE | `/users` … | add / edit / delete (name, email, password, role_id, state_id, campus_id) |
| PATCH | `/users/:id/status` | status |

## Masters — `master-service`

Same CRUD shape for each entity. List supports `?page=&limit=&search=&status=`;
`?all=1` returns the active list for dropdowns.

| Entity | Base route |
|---|---|
| States | `/masters/states` |
| Campuses | `/masters/campuses` |
| Categories | `/masters/categories` |
| Instructors | `/masters/instructors` |
| Courses | `/masters/courses` |

Per entity: `GET base`, `GET base/:id`, `POST base`, `PUT base/:id`,
`DELETE base/:id` (soft), `PATCH base/:id/status`.

**Campus dropdown params**
- `GET /masters/campuses?all=1` — all active campuses
- `GET /masters/campuses?all=1&unassigned=1` — campuses with no state (States *add*)
- `GET /masters/campuses?all=1&stateId=N` — unassigned + state N's campuses (States *edit*)

## Courses & Enrollments — `enrollment-service`

| Method | Route | Description |
|---|---|---|
| GET | `/courses` | browse active courses with live `seats_left` |
| GET | `/courses/:id/seats` | live seat count for one course |
| GET | `/enrollments` | student → own; staff/admin → all |
| POST | `/enrollments` | enroll (`{ course_id }`) — guards capacity + duplicates |
| PATCH | `/enrollments/:id/drop` | drop a course (frees the seat) |

## Conventions
- **Soft delete:** `DELETE` sets `is_deleted = true`.
- **Status toggle:** `PATCH …/status` flips `is_active`.
- **Pagination response:** `{ data: [...], total, page, limit }`.
- **Errors:** `{ error: "message" }` (401 unauth, 403 no permission, 409 conflict/full).
