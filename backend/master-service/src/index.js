require('./loadenv');
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { requireAuth } = require('./auth');
const { requirePermission } = require('./perms');
const { mountSwagger } = require('./swagger');

const app = express();
app.use(cors());
app.use(express.json());
mountSwagger(app);

const paginate = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  return { page, limit, offset: (page - 1) * limit };
};

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'master-service' }));

// ─── States ───────────────────────────────────────────────────────────────────
const S = '/masters/states';

app.get(S, requireAuth, requirePermission(S, 'view'), async (req, res) => {
  try {
    if (req.query.all) {
      const { rows } = await pool.query('SELECT id, code, name, is_active FROM states WHERE is_deleted=false AND is_active=true ORDER BY name');
      return res.json(rows);
    }
    const { page, limit, offset } = paginate(req);
    const search = `%${(req.query.search || '').toLowerCase()}%`;
    const where = ['is_deleted=false', '(LOWER(name) LIKE $1 OR LOWER(code) LIKE $1)'];
    if (req.query.status === 'active') where.push('is_active=true');
    if (req.query.status === 'inactive') where.push('is_active=false');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows: c } = await pool.query(`SELECT COUNT(*)::int AS total FROM states ${whereSql}`, [search]);
    const { rows } = await pool.query(
      `SELECT s.id, s.code, s.name, s.is_active,
              (SELECT COUNT(*)::int FROM campuses cp WHERE cp.state_id=s.id AND cp.is_deleted=false) AS campus_count
         FROM states s ${whereSql} ORDER BY s.id DESC LIMIT ${limit} OFFSET ${offset}`,
      [search],
    );
    res.json({ data: rows, total: c[0].total, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Validate the multiselected campuses aren't already owned by a different state.
async function applyStateCampuses(client, stateId, campusIds) {
  if (!Array.isArray(campusIds)) return;
  if (campusIds.length) {
    const { rows } = await client.query('SELECT id, name, state_id FROM campuses WHERE id = ANY($1) AND is_deleted=false', [campusIds]);
    const conflict = rows.find((b) => b.state_id && b.state_id !== stateId);
    if (conflict) { const e = new Error(`campus "${conflict.name}" is already mapped to another state`); e.status = 409; throw e; }
  }
  await client.query('UPDATE campuses SET state_id=NULL WHERE state_id=$1', [stateId]);
  if (campusIds.length) await client.query('UPDATE campuses SET state_id=$1 WHERE id = ANY($2)', [stateId, campusIds]);
}

app.get(`${S}/:id`, requireAuth, requirePermission(S, 'view'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, code, name, is_active FROM states WHERE id=$1 AND is_deleted=false', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'state not found' });
    const { rows: cp } = await pool.query('SELECT id FROM campuses WHERE state_id=$1 AND is_deleted=false', [req.params.id]);
    res.json({ ...rows[0], campus_ids: cp.map((x) => x.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post(S, requireAuth, requirePermission(S, 'add'), async (req, res) => {
  const { code, name, campus_ids } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('INSERT INTO states (code, name) VALUES ($1,$2) RETURNING id', [code, name]);
    await applyStateCampuses(client, rows[0].id, campus_ids);
    await client.query('COMMIT');
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'state code already exists' });
    res.status(err.status || 500).json({ error: err.message });
  } finally { client.release(); }
});

app.put(`${S}/:id`, requireAuth, requirePermission(S, 'edit'), async (req, res) => {
  const { code, name, campus_ids } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query('UPDATE states SET code=$1, name=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 AND is_deleted=false', [code, name, req.params.id]);
    if (!rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'state not found' }); }
    await applyStateCampuses(client, Number(req.params.id), campus_ids);
    await client.query('COMMIT');
    res.json({ id: Number(req.params.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'state code already exists' });
    res.status(err.status || 500).json({ error: err.message });
  } finally { client.release(); }
});

app.delete(`${S}/:id`, requireAuth, requirePermission(S, 'delete'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE states SET is_deleted=true WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'state not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch(`${S}/:id/status`, requireAuth, requirePermission(S, 'status'), async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE states SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'state not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Campuses ───────────────────────────────────────────────────────────────
const B = '/masters/campuses';

app.get(B, requireAuth, requirePermission(B, 'view'), async (req, res) => {
  try {
    if (req.query.all) {
      const conds = ['is_deleted=false', 'is_active=true'];
      const params = [];
      if (req.query.stateId) { params.push(Number(req.query.stateId)); conds.push(`(state_id IS NULL OR state_id=$${params.length})`); }
      else if (req.query.unassigned) { conds.push('state_id IS NULL'); }
      const { rows } = await pool.query(`SELECT id, code, name, state_id FROM campuses WHERE ${conds.join(' AND ')} ORDER BY name`, params);
      return res.json(rows);
    }
    const { page, limit, offset } = paginate(req);
    const search = `%${(req.query.search || '').toLowerCase()}%`;
    const where = ['b.is_deleted=false', '(LOWER(b.name) LIKE $1 OR LOWER(b.code) LIKE $1)'];
    if (req.query.status === 'active') where.push('b.is_active=true');
    if (req.query.status === 'inactive') where.push('b.is_active=false');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows: c } = await pool.query(`SELECT COUNT(*)::int AS total FROM campuses b ${whereSql}`, [search]);
    const { rows } = await pool.query(
      `SELECT b.id, b.code, b.name, b.is_active, b.state_id, s.name AS state_name
         FROM campuses b LEFT JOIN states s ON s.id=b.state_id
         ${whereSql} ORDER BY b.id DESC LIMIT ${limit} OFFSET ${offset}`, [search],
    );
    res.json({ data: rows, total: c[0].total, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post(B, requireAuth, requirePermission(B, 'add'), async (req, res) => {
  const { code, name, state_id } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
  try {
    const { rows } = await pool.query('INSERT INTO campuses (code, name, state_id) VALUES ($1,$2,$3) RETURNING id', [code, name, state_id || null]);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'campus code already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put(`${B}/:id`, requireAuth, requirePermission(B, 'edit'), async (req, res) => {
  const { code, name, state_id } = req.body || {};
  try {
    const { rows } = await pool.query('UPDATE campuses SET code=$1, name=$2, state_id=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 AND is_deleted=false RETURNING id', [code, name, state_id || null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'campus not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'campus code already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.delete(`${B}/:id`, requireAuth, requirePermission(B, 'delete'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE campuses SET is_deleted=true WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'campus not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch(`${B}/:id/status`, requireAuth, requirePermission(B, 'status'), async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE campuses SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'campus not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Categories ─────────────────────────────────────────────────────────────
const D = '/masters/categories';

app.get(D, requireAuth, requirePermission(D, 'view'), async (req, res) => {
  try {
    if (req.query.all) {
      const { rows } = await pool.query('SELECT id, name FROM categories WHERE is_deleted=false AND is_active=true ORDER BY name');
      return res.json(rows);
    }
    const { page, limit, offset } = paginate(req);
    const search = `%${(req.query.search || '').toLowerCase()}%`;
    const where = ['is_deleted=false', 'LOWER(name) LIKE $1'];
    if (req.query.status === 'active') where.push('is_active=true');
    if (req.query.status === 'inactive') where.push('is_active=false');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows: c } = await pool.query(`SELECT COUNT(*)::int AS total FROM categories ${whereSql}`, [search]);
    const { rows } = await pool.query(`SELECT id, name, is_active FROM categories ${whereSql} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, [search]);
    res.json({ data: rows, total: c[0].total, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post(D, requireAuth, requirePermission(D, 'add'), async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  try { const { rows } = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]); res.status(201).json({ id: rows[0].id }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.put(`${D}/:id`, requireAuth, requirePermission(D, 'edit'), async (req, res) => {
  const { name } = req.body || {};
  try {
    const { rows } = await pool.query('UPDATE categories SET name=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND is_deleted=false RETURNING id', [name, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'category not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete(`${D}/:id`, requireAuth, requirePermission(D, 'delete'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE categories SET is_deleted=true WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'category not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch(`${D}/:id/status`, requireAuth, requirePermission(D, 'status'), async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE categories SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'category not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Instructors ────────────────────────────────────────────────────────────
const DR = '/masters/instructors';

app.get(DR, requireAuth, requirePermission(DR, 'view'), async (req, res) => {
  try {
    if (req.query.all) {
      const { rows } = await pool.query(
        `SELECT i.id, i.name, i.designation, i.campus_id, cat.name AS category_name
           FROM instructors i LEFT JOIN categories cat ON cat.id=i.category_id
          WHERE i.is_deleted=false AND i.is_active=true ORDER BY i.name`,
      );
      return res.json(rows);
    }
    const { page, limit, offset } = paginate(req);
    const search = `%${(req.query.search || '').toLowerCase()}%`;
    const where = ['i.is_deleted=false', '(LOWER(i.name) LIKE $1 OR LOWER(i.email) LIKE $1)'];
    if (req.query.status === 'active') where.push('i.is_active=true');
    if (req.query.status === 'inactive') where.push('i.is_active=false');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows: c } = await pool.query(`SELECT COUNT(*)::int AS total FROM instructors i ${whereSql}`, [search]);
    const { rows } = await pool.query(
      `SELECT i.id, i.name, i.email, i.designation, i.is_active, i.category_id, i.campus_id,
              cat.name AS category_name, cp.name AS campus_name
         FROM instructors i
         LEFT JOIN categories cat ON cat.id=i.category_id
         LEFT JOIN campuses cp ON cp.id=i.campus_id
         ${whereSql} ORDER BY i.id DESC LIMIT ${limit} OFFSET ${offset}`, [search],
    );
    res.json({ data: rows, total: c[0].total, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get(`${DR}/:id`, requireAuth, requirePermission(DR, 'view'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, designation, category_id, campus_id, is_active FROM instructors WHERE id=$1 AND is_deleted=false', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'instructor not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post(DR, requireAuth, requirePermission(DR, 'add'), async (req, res) => {
  const { name, email, designation, category_id, campus_id } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO instructors (name, email, designation, category_id, campus_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, email || null, designation || null, category_id || null, campus_id || null],
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put(`${DR}/:id`, requireAuth, requirePermission(DR, 'edit'), async (req, res) => {
  const { name, email, designation, category_id, campus_id } = req.body || {};
  try {
    const { rows } = await pool.query(
      'UPDATE instructors SET name=$1, email=$2, designation=$3, category_id=$4, campus_id=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 AND is_deleted=false RETURNING id',
      [name, email || null, designation || null, category_id || null, campus_id || null, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'instructor not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete(`${DR}/:id`, requireAuth, requirePermission(DR, 'delete'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE instructors SET is_deleted=true WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'instructor not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch(`${DR}/:id/status`, requireAuth, requirePermission(DR, 'status'), async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE instructors SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'instructor not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Courses ────────────────────────────────────────────────────────────────
const CO = '/masters/courses';

app.get(CO, requireAuth, requirePermission(CO, 'view'), async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req);
    const search = `%${(req.query.search || '').toLowerCase()}%`;
    const where = ['co.is_deleted=false', '(LOWER(co.name) LIKE $1 OR LOWER(co.code) LIKE $1)'];
    if (req.query.status === 'active') where.push('co.is_active=true');
    if (req.query.status === 'inactive') where.push('co.is_active=false');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows: c } = await pool.query(`SELECT COUNT(*)::int AS total FROM courses co ${whereSql}`, [search]);
    const { rows } = await pool.query(
      `SELECT co.id, co.code, co.name, co.capacity, co.day_of_week,
              to_char(co.start_time,'HH24:MI') AS start_time, to_char(co.end_time,'HH24:MI') AS end_time,
              co.is_active, co.category_id, co.instructor_id, co.campus_id,
              cat.name AS category_name, i.name AS instructor_name, cp.name AS campus_name
         FROM courses co
         LEFT JOIN categories cat ON cat.id=co.category_id
         LEFT JOIN instructors i ON i.id=co.instructor_id
         LEFT JOIN campuses cp ON cp.id=co.campus_id
         ${whereSql} ORDER BY co.id DESC LIMIT ${limit} OFFSET ${offset}`, [search],
    );
    res.json({ data: rows, total: c[0].total, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get(`${CO}/:id`, requireAuth, requirePermission(CO, 'view'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, code, name, category_id, instructor_id, campus_id, capacity, day_of_week,
              to_char(start_time,'HH24:MI') AS start_time, to_char(end_time,'HH24:MI') AS end_time, is_active
         FROM courses WHERE id=$1 AND is_deleted=false`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'course not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post(CO, requireAuth, requirePermission(CO, 'add'), async (req, res) => {
  const { code, name, category_id, instructor_id, campus_id, capacity, day_of_week, start_time, end_time } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO courses (code, name, category_id, instructor_id, campus_id, capacity, day_of_week, start_time, end_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [code, name, category_id || null, instructor_id || null, campus_id || null, capacity || 30,
       day_of_week ?? null, start_time || null, end_time || null],
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'course code already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put(`${CO}/:id`, requireAuth, requirePermission(CO, 'edit'), async (req, res) => {
  const { code, name, category_id, instructor_id, campus_id, capacity, day_of_week, start_time, end_time } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE courses SET code=$1, name=$2, category_id=$3, instructor_id=$4, campus_id=$5, capacity=$6,
         day_of_week=$7, start_time=$8, end_time=$9, updated_at=CURRENT_TIMESTAMP
       WHERE id=$10 AND is_deleted=false RETURNING id`,
      [code, name, category_id || null, instructor_id || null, campus_id || null, capacity || 30,
       day_of_week ?? null, start_time || null, end_time || null, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'course not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'course code already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.delete(`${CO}/:id`, requireAuth, requirePermission(CO, 'delete'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE courses SET is_deleted=true WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'course not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch(`${CO}/:id/status`, requireAuth, requirePermission(CO, 'status'), async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE courses SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'course not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`[master-service] listening on :${PORT}`));
