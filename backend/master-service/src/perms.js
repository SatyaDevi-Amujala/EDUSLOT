const pool = require('./db');

// Enforce a permission for a page route + action (view|add|edit|delete|status|download).
function requirePermission(route, action) {
  const col = `can_${action}`;
  return async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT rp.${col} AS allowed
           FROM users u
           JOIN pages p ON p.route = $2 AND p.is_deleted = false
           LEFT JOIN role_permissions rp ON rp.page_id = p.id AND rp.role_id = u.role_id
          WHERE u.id = $1`,
        [req.user.sub, route],
      );
      if (rows[0] && rows[0].allowed) return next();
      return res.status(403).json({ error: `not permitted: ${action} on ${route}` });
    } catch (err) {
      console.error('requirePermission failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { requirePermission };
