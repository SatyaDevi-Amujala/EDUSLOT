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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'enrollment-service' }));

// ─── Browse courses (any authenticated user) ─────────────────────────────────
// Returns active courses with live seats_taken / seats_left — the scarce
// resource students compete for (Redis cache + WebSockets land on this in later weeks).
app.get('/courses', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT co.id, co.code, co.name, co.capacity, co.day_of_week,
              to_char(co.start_time,'HH24:MI') AS start_time, to_char(co.end_time,'HH24:MI') AS end_time,
              cat.name AS category_name, i.name AS instructor_name, cp.name AS campus_name,
              (SELECT COUNT(*)::int FROM enrollments e
                 WHERE e.course_id=co.id AND e.status='enrolled' AND e.is_deleted=false) AS seats_taken
         FROM courses co
         LEFT JOIN categories cat ON cat.id=co.category_id
         LEFT JOIN instructors i ON i.id=co.instructor_id
         LEFT JOIN campuses cp ON cp.id=co.campus_id
        WHERE co.is_deleted=false AND co.is_active=true
        ORDER BY co.name`,
    );
    const data = rows.map((c) => ({
      ...c,
      day_name: c.day_of_week == null ? null : DAYS[c.day_of_week],
      seats_left: Math.max(0, c.capacity - c.seats_taken),
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Live seat count for a single course (used to refresh the card before enroll).
app.get('/courses/:id/seats', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT co.capacity,
              (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id=co.id AND e.status='enrolled' AND e.is_deleted=false) AS seats_taken
         FROM courses co WHERE co.id=$1 AND co.is_deleted=false`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'course not found' });
    const { capacity, seats_taken } = rows[0];
    res.json({ capacity, seats_taken, seats_left: Math.max(0, capacity - seats_taken) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Enrollments ──────────────────────────────────────────────────────────────
app.get('/enrollments', requireAuth, requirePermission('/enrollments', 'view'), async (req, res) => {
  try {
    const base = `SELECT e.id, e.user_id, e.course_id, e.campus_id, e.status, e.created_at,
                         co.name AS course_name, co.code AS course_code,
                         to_char(co.start_time,'HH24:MI') AS start_time, to_char(co.end_time,'HH24:MI') AS end_time,
                         co.day_of_week, i.name AS instructor_name, cp.name AS campus_name, u.name AS user_name
                    FROM enrollments e
                    LEFT JOIN courses co ON co.id=e.course_id
                    LEFT JOIN instructors i ON i.id=co.instructor_id
                    LEFT JOIN campuses cp ON cp.id=e.campus_id
                    LEFT JOIN users u ON u.id=e.user_id
                   WHERE e.is_deleted=false`;
    const rows = req.user.role === 'student'
      ? (await pool.query(`${base} AND e.user_id=$1 ORDER BY e.created_at DESC`, [req.user.sub])).rows
      : (await pool.query(`${base} ORDER BY e.created_at DESC`)).rows;
    res.json(rows.map((r) => ({ ...r, day_name: r.day_of_week == null ? null : DAYS[r.day_of_week] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Enroll in a course (take a seat). Guards capacity + duplicate enrollment.
app.post('/enrollments', requireAuth, requirePermission('/courses', 'add'), async (req, res) => {
  const { course_id } = req.body || {};
  if (!course_id) return res.status(400).json({ error: 'course_id is required' });
  const userId = req.user.role === 'student' ? req.user.sub : req.body.user_id || req.user.sub;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the course row so concurrent enrolls can't oversell the last seat.
    const { rows: cr } = await client.query('SELECT capacity, campus_id FROM courses WHERE id=$1 AND is_deleted=false AND is_active=true FOR UPDATE', [course_id]);
    if (!cr[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'course not found' }); }

    const { rows: taken } = await client.query(
      `SELECT COUNT(*)::int AS n FROM enrollments WHERE course_id=$1 AND status='enrolled' AND is_deleted=false`, [course_id]);
    if (taken[0].n >= cr[0].capacity) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'course is full — no seats left' }); }

    // Re-activate a previously dropped enrollment, else insert a new one.
    const { rows: existing } = await client.query('SELECT id, status FROM enrollments WHERE user_id=$1 AND course_id=$2', [userId, course_id]);
    if (existing[0]) {
      if (existing[0].status === 'enrolled') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'already enrolled in this course' }); }
      await client.query(`UPDATE enrollments SET status='enrolled', is_deleted=false, campus_id=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [existing[0].id, cr[0].campus_id]);
      await client.query('COMMIT');
      return res.status(201).json({ id: existing[0].id });
    }
    const { rows } = await client.query(
      `INSERT INTO enrollments (user_id, course_id, campus_id) VALUES ($1,$2,$3) RETURNING id`,
      [userId, course_id, cr[0].campus_id]);
    await client.query('COMMIT');
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Drop a course (frees the seat).
app.patch('/enrollments/:id/drop', requireAuth, async (req, res) => {
  try {
    const owner = req.user.role === 'student' ? ' AND user_id=$2' : '';
    const params = owner ? [req.params.id, req.user.sub] : [req.params.id];
    const { rows } = await pool.query(`UPDATE enrollments SET status='dropped', updated_at=CURRENT_TIMESTAMP WHERE id=$1${owner} RETURNING id, status`, params);
    if (!rows[0]) return res.status(404).json({ error: 'enrollment not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`[enrollment-service] listening on :${PORT}`));
