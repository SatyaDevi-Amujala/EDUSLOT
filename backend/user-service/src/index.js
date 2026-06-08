require('./loadenv');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');
const { signToken, requireAuth, requireRole } = require('./auth');
const { loadUserPermissions, requirePermission } = require('./perms');
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

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post('/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
  try {
    const hash = await bcrypt.hash(password, 10);
    // New self-service signups become the default "Customer" role.
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, role_id)
       VALUES ($1,$2,$3,'student', (SELECT id FROM roles WHERE name='Student' LIMIT 1))
       RETURNING id, name, email, role, role_id, created_at`,
      [name, email, hash],
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'email already registered' });
    console.error('POST /auth/signup failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, role_id, password_hash, is_active, is_deleted FROM users WHERE email = $1',
      [email],
    );
    const user = rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'invalid credentials' });
    if (user.is_deleted || user.is_active === false) return res.status(403).json({ error: 'account is inactive' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role, role_id: user.role_id };
    res.json({ token: signToken(safe), user: safe });
  } catch (err) {
    console.error('POST /auth/login failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, role_id, created_at FROM users WHERE id = $1', [req.user.sub],
    );
    if (!rows[0]) return res.status(404).json({ error: 'user not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// The shell calls this after login to build the dynamic sidebar + permission map.
app.get('/auth/permissions', requireAuth, async (req, res) => {
  try {
    const result = await loadUserPermissions(req.user.sub);
    if (!result) return res.status(404).json({ error: 'user not found' });
    res.json(result);
  } catch (err) {
    console.error('GET /auth/permissions failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Pages master (admin) ─────────────────────────────────────────────────────

app.get('/pages', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, route, parent_id, icon, sort_order,
              has_view, has_add, has_edit, has_delete, has_status, has_download,
              is_active, is_deleted
         FROM pages WHERE is_deleted = false ORDER BY sort_order, id`,
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/pages', requireAuth, requireRole('admin'), async (req, res) => {
  const b = req.body || {};
  try {
    const { rows } = await pool.query(
      `INSERT INTO pages (name, route, parent_id, icon, sort_order,
         has_view, has_add, has_edit, has_delete, has_status, has_download)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.name, b.route || null, b.parent_id || null, b.icon || null, b.sort_order || 0,
       !!b.has_view, !!b.has_add, !!b.has_edit, !!b.has_delete, !!b.has_status, !!b.has_download],
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/pages/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const b = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE pages SET name=$1, route=$2, parent_id=$3, icon=$4, sort_order=$5,
         has_view=$6, has_add=$7, has_edit=$8, has_delete=$9, has_status=$10, has_download=$11,
         updated_at=CURRENT_TIMESTAMP
       WHERE id=$12 RETURNING *`,
      [b.name, b.route || null, b.parent_id || null, b.icon || null, b.sort_order || 0,
       !!b.has_view, !!b.has_add, !!b.has_edit, !!b.has_delete, !!b.has_status, !!b.has_download, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'page not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/pages/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE pages SET is_deleted=true WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'page not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/pages/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE pages SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'page not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Roles ────────────────────────────────────────────────────────────────────

app.get('/roles', requireAuth, requirePermission('/roles', 'view'), async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const search = `%${(req.query.search || '').toLowerCase()}%`;
  const status = req.query.status; // 'active' | 'inactive' | undefined
  try {
    const where = ['is_deleted = false', 'LOWER(name) LIKE $1'];
    const params = [search];
    if (status === 'active') where.push('is_active = true');
    if (status === 'inactive') where.push('is_active = false');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM roles ${whereSql}`, params);
    const { rows } = await pool.query(
      `SELECT r.id, r.name, r.description, r.is_active,
              (SELECT COUNT(*)::int FROM role_permissions rp WHERE rp.role_id = r.id AND rp.can_view) AS page_count
         FROM roles r ${whereSql} ORDER BY r.id DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    res.json({ data: rows, total: countRows[0].total, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/roles/:id', requireAuth, requirePermission('/roles', 'view'), async (req, res) => {
  try {
    const { rows: roleRows } = await pool.query('SELECT id, name, description, is_active FROM roles WHERE id=$1 AND is_deleted=false', [req.params.id]);
    if (!roleRows[0]) return res.status(404).json({ error: 'role not found' });
    const { rows: perms } = await pool.query(
      `SELECT p.id AS page_id, p.name, p.route, p.parent_id,
              p.has_view, p.has_add, p.has_edit, p.has_delete, p.has_status, p.has_download,
              COALESCE(rp.can_view,false)     AS can_view,
              COALESCE(rp.can_add,false)      AS can_add,
              COALESCE(rp.can_edit,false)     AS can_edit,
              COALESCE(rp.can_delete,false)   AS can_delete,
              COALESCE(rp.can_status,false)   AS can_status,
              COALESCE(rp.can_download,false) AS can_download
         FROM pages p
         LEFT JOIN role_permissions rp ON rp.page_id = p.id AND rp.role_id = $1
        WHERE p.is_deleted = false ORDER BY p.sort_order, p.id`,
      [req.params.id],
    );
    res.json({ ...roleRows[0], permissions: perms });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function replacePermissions(client, roleId, permissions) {
  await client.query('DELETE FROM role_permissions WHERE role_id=$1', [roleId]);
  for (const p of permissions || []) {
    if (!(p.can_view || p.can_add || p.can_edit || p.can_delete || p.can_status || p.can_download)) continue;
    await client.query(
      `INSERT INTO role_permissions (role_id, page_id, can_view, can_add, can_edit, can_delete, can_status, can_download)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [roleId, p.page_id, !!p.can_view, !!p.can_add, !!p.can_edit, !!p.can_delete, !!p.can_status, !!p.can_download],
    );
  }
}

app.post('/roles', requireAuth, requirePermission('/roles', 'add'), async (req, res) => {
  const { name, description, permissions } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('INSERT INTO roles (name, description) VALUES ($1,$2) RETURNING id', [name, description || null]);
    await replacePermissions(client, rows[0].id, permissions);
    await client.query('COMMIT');
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'role name already exists' });
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.put('/roles/:id', requireAuth, requirePermission('/roles', 'edit'), async (req, res) => {
  const { name, description, permissions } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      'UPDATE roles SET name=$1, description=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 AND is_deleted=false',
      [name, description || null, req.params.id],
    );
    if (!rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'role not found' }); }
    if (permissions) await replacePermissions(client, req.params.id, permissions);
    await client.query('COMMIT');
    res.json({ id: Number(req.params.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'role name already exists' });
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.delete('/roles/:id', requireAuth, requirePermission('/roles', 'delete'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE roles SET is_deleted=true WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'role not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/roles/:id/status', requireAuth, requirePermission('/roles', 'status'), async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE roles SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'role not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Users ────────────────────────────────────────────────────────────────────

app.get('/users', requireAuth, requirePermission('/users', 'view'), async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const search = `%${(req.query.search || '').toLowerCase()}%`;
  const status = req.query.status;
  try {
    const where = ['u.is_deleted = false', '(LOWER(u.name) LIKE $1 OR LOWER(u.email) LIKE $1)'];
    const params = [search];
    if (status === 'active') where.push('u.is_active = true');
    if (status === 'inactive') where.push('u.is_active = false');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM users u ${whereSql}`, params);
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.is_active, u.role_id, u.state_id, u.campus_id,
              r.name AS role_name, s.name AS state_name, c.name AS campus_name
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         LEFT JOIN states s ON s.id = u.state_id
         LEFT JOIN campuses c ON c.id = u.campus_id
         ${whereSql} ORDER BY u.id DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    res.json({ data: rows, total: countRows[0].total, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/users', requireAuth, requirePermission('/users', 'add'), async (req, res) => {
  const { name, email, password, role_id, state_id, campus_id } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password are required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, role_id, state_id, campus_id)
       VALUES ($1,$2,$3,'student',$4,$5,$6)
       RETURNING id, name, email, role_id, state_id, campus_id, is_active`,
      [name, email, hash, role_id || null, state_id || null, campus_id || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'email already registered' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/users/:id', requireAuth, requirePermission('/users', 'edit'), async (req, res) => {
  const { name, email, password, role_id, state_id, campus_id } = req.body || {};
  try {
    let hashClause = '';
    const params = [name, email, role_id || null, state_id || null, campus_id || null];
    if (password) { const hash = await bcrypt.hash(password, 10); params.push(hash); hashClause = `, password_hash=$${params.length}`; }
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET name=$1, email=$2, role_id=$3, state_id=$4, campus_id=$5${hashClause}, updated_at=CURRENT_TIMESTAMP
       WHERE id=$${params.length} AND is_deleted=false
       RETURNING id, name, email, role_id, state_id, campus_id, is_active`,
      params,
    );
    if (!rows[0]) return res.status(404).json({ error: 'user not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'email already registered' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/users/:id', requireAuth, requirePermission('/users', 'delete'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE users SET is_deleted=true WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'user not found' });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/users/:id/status', requireAuth, requirePermission('/users', 'status'), async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'user not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`[user-service] listening on :${PORT}`));
