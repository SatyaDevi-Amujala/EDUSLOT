// Seeds RBAC (pages, roles, permissions) + EduSlot masters, and links users to
// roles. Run AFTER db/seed.js:
//   node db/seed.js
//   node db/seed_rbac.js
// Idempotent: rebuilds pages/permissions and re-links roles each run.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

function loadEnv() {
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const client = new pg.Client({
  host: 'localhost',
  port: Number(env.DB_PORT || 5432),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

const F = (v, a, e, d, s, dl) => ({ has_view: v, has_add: a, has_edit: e, has_delete: d, has_status: s, has_download: dl });
const CRUD = F(true, true, true, true, true, true);
const VIEW_ADD = F(true, true, false, false, false, false);
const VIEW_ONLY = F(true, false, false, false, false, false);

// key/parentKey are local-only, used to resolve parent_id after insert.
const PAGES = [
  { key: 'dashboard',   name: 'Dashboard',        route: '/dashboard',           parentKey: null,      icon: 'dashboard', sort: 1, ...VIEW_ONLY },

  { key: 'masters',     name: 'Masters',          route: null,                   parentKey: null,      icon: 'masters',   sort: 2, ...VIEW_ONLY },
  { key: 'states',      name: 'States',           route: '/masters/states',      parentKey: 'masters', icon: 'states',    sort: 1, ...CRUD },
  { key: 'campuses',    name: 'Campuses',         route: '/masters/campuses',    parentKey: 'masters', icon: 'branches',  sort: 2, ...CRUD },
  { key: 'categories',  name: 'Categories',       route: '/masters/categories',  parentKey: 'masters', icon: 'depts',     sort: 3, ...CRUD },
  { key: 'instructors', name: 'Instructors',      route: '/masters/instructors', parentKey: 'masters', icon: 'doctors',   sort: 4, ...CRUD },
  { key: 'courses',     name: 'Courses',          route: '/masters/courses',     parentKey: 'masters', icon: 'appts',     sort: 5, ...CRUD },

  { key: 'roles',       name: 'Role Management',  route: '/roles',               parentKey: null,      icon: 'roles',     sort: 3, ...CRUD },
  { key: 'users',       name: 'User Management',  route: '/users',               parentKey: null,      icon: 'users',     sort: 4, ...CRUD },

  { key: 'enroll',      name: 'Enrollment',       route: null,                   parentKey: null,      icon: 'appts',     sort: 5, ...VIEW_ONLY },
  { key: 'browse',      name: 'Browse Courses',   route: '/courses',             parentKey: 'enroll',  icon: 'list',      sort: 1, ...VIEW_ADD },
  { key: 'my-enroll',   name: 'My Enrollments',   route: '/enrollments',         parentKey: 'enroll',  icon: 'plus',      sort: 2, ...VIEW_ONLY },
];

const STATES = [
  { code: 'TS', name: 'Telangana' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'TN', name: 'Tamil Nadu' },
];
const CAMPUSES = [
  { code: 'HYD', name: 'Hyderabad Campus', state: 'TS' },
  { code: 'WGL', name: 'Warangal Campus',  state: 'TS' },
  { code: 'BLR', name: 'Bangalore Campus', state: 'KA' },
  { code: 'MUM', name: 'Mumbai Campus',    state: 'MH' },
  { code: 'CHE', name: 'Chennai Campus',   state: 'TN' },
];
const CATEGORIES = ['Web Development', 'Data Science', 'Design', 'Cloud & DevOps'];
const INSTRUCTORS = [
  { name: 'Anil Rao',    email: 'anil@eduslot.com',   designation: 'Senior Instructor', cat: 'Web Development', campus: 'HYD' },
  { name: 'Meera Nair',  email: 'meera@eduslot.com',  designation: 'Instructor',        cat: 'Data Science',    campus: 'BLR' },
  { name: 'Sameer Khan', email: 'sameer@eduslot.com', designation: 'Lead Instructor',   cat: 'Design',          campus: 'MUM' },
];
const COURSES = [
  { code: 'WD101', name: 'React Fundamentals',     cat: 'Web Development', instr: 'Anil Rao',    campus: 'HYD', capacity: 30, dow: 1, s: '18:00', e: '20:00' },
  { code: 'WD201', name: 'Node.js & APIs',         cat: 'Web Development', instr: 'Anil Rao',    campus: 'HYD', capacity: 25, dow: 3, s: '18:00', e: '20:00' },
  { code: 'DS101', name: 'Python for Data Science', cat: 'Data Science',   instr: 'Meera Nair',  campus: 'BLR', capacity: 40, dow: 2, s: '10:00', e: '12:00' },
  { code: 'DG101', name: 'UI/UX Design Basics',    cat: 'Design',          instr: 'Sameer Khan', campus: 'MUM', capacity: 20, dow: 6, s: '09:00', e: '11:00' },
];

async function main() {
  await client.connect();
  console.log('[seed-rbac] connected to', env.DB_NAME);

  // ---- Pages (rebuild) -----------------------------------------------------
  await client.query('DELETE FROM role_permissions');
  await client.query('DELETE FROM pages');
  const pageId = {};
  for (const p of PAGES.filter((x) => !x.parentKey).concat(PAGES.filter((x) => x.parentKey))) {
    const { rows } = await client.query(
      `INSERT INTO pages (name, route, parent_id, icon, sort_order,
         has_view, has_add, has_edit, has_delete, has_status, has_download)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [p.name, p.route, p.parentKey ? pageId[p.parentKey] : null, p.icon, p.sort,
       p.has_view, p.has_add, p.has_edit, p.has_delete, p.has_status, p.has_download],
    );
    pageId[p.key] = rows[0].id;
  }
  console.log(`[seed-rbac] inserted ${PAGES.length} pages`);

  // ---- Roles ---------------------------------------------------------------
  const upsertRole = async (name, description) => {
    const { rows } = await client.query(
      `INSERT INTO roles (name, description) VALUES ($1,$2)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
      [name, description],
    );
    return rows[0].id;
  };
  const adminRole = await upsertRole('Administrator', 'Full access to everything');
  const managerRole = await upsertRole('Campus Manager', 'Manages campus masters and views enrollments');
  const studentRole = await upsertRole('Student', 'Can browse courses and manage own enrollments');

  const grant = async (roleId, key, p) => {
    await client.query(
      `INSERT INTO role_permissions (role_id, page_id, can_view, can_add, can_edit, can_delete, can_status, can_download)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (role_id, page_id) DO UPDATE SET
         can_view=EXCLUDED.can_view, can_add=EXCLUDED.can_add, can_edit=EXCLUDED.can_edit,
         can_delete=EXCLUDED.can_delete, can_status=EXCLUDED.can_status, can_download=EXCLUDED.can_download`,
      [roleId, pageId[key], p.v, p.a, p.e, p.d, p.s, p.dl],
    );
  };
  const ALL = { v: true, a: true, e: true, d: true, s: true, dl: true };
  const VA = { v: true, a: true, e: false, d: false, s: false, dl: false };
  const V = { v: true, a: false, e: false, d: false, s: false, dl: false };

  // Administrator: everything.
  for (const key of Object.keys(pageId)) await grant(adminRole, key, ALL);

  // Campus Manager: masters (view/edit, no role/user admin) + enrollment view.
  for (const key of ['dashboard', 'masters', 'states', 'campuses', 'categories', 'instructors', 'courses', 'enroll', 'browse', 'my-enroll']) {
    await grant(managerRole, key, key === 'masters' || key === 'enroll' || key === 'dashboard' ? V : { v: true, a: true, e: true, d: false, s: true, dl: true });
  }

  // Student: only the Enrollment group.
  await grant(studentRole, 'enroll', V);
  await grant(studentRole, 'browse', VA);
  await grant(studentRole, 'my-enroll', V);
  console.log('[seed-rbac] roles + permissions set (Administrator, Campus Manager, Student)');

  // ---- Link users to roles -------------------------------------------------
  await client.query(`UPDATE users SET role_id=$1 WHERE email='admin@example.com'`, [adminRole]);
  await client.query(`UPDATE users SET role_id=$1 WHERE email='manager@example.com'`, [managerRole]);
  await client.query(`UPDATE users SET role_id=$1 WHERE role_id IS NULL`, [studentRole]);
  console.log('[seed-rbac] linked users to roles');

  // ---- Masters -------------------------------------------------------------
  const stateId = {};
  for (const s of STATES) {
    const { rows } = await client.query(
      `INSERT INTO states (code, name) VALUES ($1,$2)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [s.code, s.name],
    );
    stateId[s.code] = rows[0].id;
  }
  const campusId = {};
  for (const c of CAMPUSES) {
    const { rows } = await client.query(
      `INSERT INTO campuses (code, name, state_id) VALUES ($1,$2,$3)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, state_id=EXCLUDED.state_id RETURNING id`,
      [c.code, c.name, stateId[c.state]],
    );
    campusId[c.code] = rows[0].id;
  }
  const catId = {};
  for (const name of CATEGORIES) {
    const found = await client.query('SELECT id FROM categories WHERE name=$1', [name]);
    catId[name] = found.rows[0] ? found.rows[0].id
      : (await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name])).rows[0].id;
  }
  const instrId = {};
  for (const i of INSTRUCTORS) {
    const found = await client.query('SELECT id FROM instructors WHERE email=$1', [i.email]);
    if (found.rows[0]) {
      instrId[i.name] = found.rows[0].id;
      await client.query('UPDATE instructors SET name=$1, designation=$2, category_id=$3, campus_id=$4 WHERE id=$5',
        [i.name, i.designation, catId[i.cat], campusId[i.campus], found.rows[0].id]);
    } else {
      instrId[i.name] = (await client.query(
        'INSERT INTO instructors (name, email, designation, category_id, campus_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [i.name, i.email, i.designation, catId[i.cat], campusId[i.campus]])).rows[0].id;
    }
  }
  for (const c of COURSES) {
    await client.query(
      `INSERT INTO courses (code, name, category_id, instructor_id, campus_id, capacity, day_of_week, start_time, end_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, category_id=EXCLUDED.category_id,
         instructor_id=EXCLUDED.instructor_id, campus_id=EXCLUDED.campus_id, capacity=EXCLUDED.capacity,
         day_of_week=EXCLUDED.day_of_week, start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time`,
      [c.code, c.name, catId[c.cat], instrId[c.instr], campusId[c.campus], c.capacity, c.dow, c.s, c.e],
    );
  }
  console.log(`[seed-rbac] masters: ${STATES.length} states, ${CAMPUSES.length} campuses, ${CATEGORIES.length} categories, ${INSTRUCTORS.length} instructors, ${COURSES.length} courses`);

  await client.end();
  console.log('[seed-rbac] done.');
}

main().catch((err) => {
  console.error('[seed-rbac] failed:', err);
  process.exit(1);
});
