-- EduSlot — Course / Class Enrollment Platform
-- Run against your local PostgreSQL database (default: ProjectA):
--   node db/migrate.js     (preferred, no psql needed)
--   psql -U <user> -d ProjectA -f db/schema.sql
-- Idempotent — safe to re-run.

-- ============================================================================
-- Cleanup: drop obsolete appointment-era tables (re-theme to EduSlot)
-- ============================================================================
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS doctor_schedules CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- ============================================================================
-- Core identity
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- RBAC: pages -> roles -> role_permissions -> users
-- ============================================================================

-- pages drives BOTH the dynamic sidebar AND the permission matrix.
-- parent_id is a self-FK: a row with parent_id = NULL is a top-level group/page;
-- rows pointing at it render as its children in the sidebar.
CREATE TABLE IF NOT EXISTS pages (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  route         TEXT,                       -- NULL for pure parent groups
  parent_id     INT REFERENCES pages(id) ON DELETE CASCADE,
  icon          TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  has_view      BOOLEAN NOT NULL DEFAULT TRUE,
  has_add       BOOLEAN NOT NULL DEFAULT FALSE,
  has_edit      BOOLEAN NOT NULL DEFAULT FALSE,
  has_delete    BOOLEAN NOT NULL DEFAULT FALSE,
  has_status    BOOLEAN NOT NULL DEFAULT FALSE,
  has_download  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id            SERIAL PRIMARY KEY,
  role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  page_id       INT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  can_view      BOOLEAN NOT NULL DEFAULT FALSE,
  can_add       BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit      BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete    BOOLEAN NOT NULL DEFAULT FALSE,
  can_status    BOOLEAN NOT NULL DEFAULT FALSE,
  can_download  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (role_id, page_id)
);

-- Link users to a role + home state/campus. Keep legacy `role` text for the JWT.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id    INT REFERENCES roles(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state_id   INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS campus_id  INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- Masters: states, campuses, categories, instructors, courses
-- ============================================================================

CREATE TABLE IF NOT EXISTS states (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A campus belongs to AT MOST ONE state (single state_id). This enforces
-- "a campus already mapped to a state cannot be mapped to another".
CREATE TABLE IF NOT EXISTS campuses (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  state_id    INT REFERENCES states(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wire the user FKs added above.
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_state_fk  FOREIGN KEY (state_id)  REFERENCES states(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_campus_fk FOREIGN KEY (campus_id) REFERENCES campuses(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instructors (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT,
  designation   TEXT,
  category_id   INT REFERENCES categories(id) ON DELETE SET NULL,
  campus_id     INT REFERENCES campuses(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A course is a scheduled class with limited seats — the scarce resource that
-- students compete to enroll in (powers the Redis/WebSocket/idempotency weeks).
-- day_of_week: 0=Sun .. 6=Sat.
CREATE TABLE IF NOT EXISTS courses (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  category_id   INT REFERENCES categories(id) ON DELETE SET NULL,
  instructor_id INT REFERENCES instructors(id) ON DELETE SET NULL,
  campus_id     INT REFERENCES campuses(id) ON DELETE SET NULL,
  capacity      INT NOT NULL DEFAULT 30,
  day_of_week   SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME,
  end_time      TIME,
  start_date    DATE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Enrollments (a student takes a seat in a course)
-- ============================================================================

CREATE TABLE IF NOT EXISTS enrollments (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     INT REFERENCES courses(id) ON DELETE SET NULL,
  campus_id     INT REFERENCES campuses(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'enrolled',  -- enrolled | dropped | completed
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- A student can hold only one active seat per course (prevents double-enroll).
  UNIQUE (user_id, course_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pages_parent       ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_role_perms_role     ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_campuses_state      ON campuses(state_id);
CREATE INDEX IF NOT EXISTS idx_courses_campus      ON courses(campus_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor  ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user    ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON enrollments(course_id);
