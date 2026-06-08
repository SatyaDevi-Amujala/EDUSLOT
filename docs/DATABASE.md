# Database Reference — EduSlot

PostgreSQL database: **`ProjectA`**. All tables are created by `db/schema.sql`
(idempotent). Run via `node db/migrate.js`.

## Entity overview

```
states ──< campuses ──< instructors >── categories
                          │
                          └──< courses >── categories, instructors, campuses
roles ──< role_permissions >── pages (self-referencing parent_id)
roles ──< users >── states, campuses
users ──< enrollments >── courses, campuses
```

## RBAC tables

### `pages`
Drives **both** the dynamic sidebar and the permission matrix.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | text | menu label |
| route | text | URL path; `NULL` for parent groups |
| parent_id | int FK→pages.id | self-reference → nesting |
| icon | text | sidebar icon key |
| sort_order | int | menu ordering |
| has_view / has_add / has_edit / has_delete / has_status / has_download | bool | actions this page supports |
| is_active / is_deleted | bool | status toggle / soft delete |

### `roles`
`id, name (UNIQUE), description, is_active, is_deleted`

### `role_permissions`
One row per (role, page). Booleans = granted actions.
`role_id, page_id, can_view, can_add, can_edit, can_delete, can_status, can_download` — `UNIQUE(role_id, page_id)`

### `users`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name, email (UNIQUE), password_hash | | bcrypt |
| role | text | legacy role string in the JWT |
| role_id | int FK→roles.id | RBAC role |
| state_id | int FK→states.id | home state |
| campus_id | int FK→campuses.id | home campus |
| is_active / is_deleted | bool | |

## Master tables

### `states`
`id, code (UNIQUE), name, is_active, is_deleted`

### `campuses`
`id, code (UNIQUE), name, state_id (FK→states), is_active, is_deleted`
A campus references **one** state → enforces *one campus per state*.

### `categories`
`id, name, is_active, is_deleted`

### `instructors`
`id, name, email, designation, category_id (FK), campus_id (FK), is_active, is_deleted`

### `courses`
The scarce resource students compete to enroll in.

| Column | Type | Notes |
|---|---|---|
| code | text UNIQUE | |
| name | text | |
| category_id / instructor_id / campus_id | int FK | |
| capacity | int | total seats (default 30) |
| day_of_week | smallint | 0=Sun .. 6=Sat |
| start_time / end_time | time | class window |
| is_active / is_deleted | bool | |

## Enrollments

### `enrollments`
| Column | Type | Notes |
|---|---|---|
| user_id | int FK→users.id | |
| course_id | int FK→courses.id | |
| campus_id | int FK→campuses.id | |
| status | text | enrolled / dropped / completed |
| is_deleted | bool | |
| | | UNIQUE(user_id, course_id) — prevents double enrollment |

`seats_left` is computed live as `capacity − COUNT(enrollments where status='enrolled')`.
Enrollment uses `SELECT … FOR UPDATE` on the course row so concurrent requests
can't oversell the last seat.

## Seeded data
- **Users:** `admin@example.com`, `manager@example.com`, 6 students — password `password123`.
- **Roles:** `Administrator`, `Campus Manager`, `Student`.
- **Pages:** Dashboard, Masters (States/Campuses/Categories/Instructors/Courses), Role Management, User Management, Enrollment (Browse/My Enrollments).
- **Masters:** 4 states, 5 campuses, 4 categories, 3 instructors, 4 courses.
