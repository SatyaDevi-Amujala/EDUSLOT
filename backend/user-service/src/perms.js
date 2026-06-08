const pool = require('./db');

// Returns the user's role + the pages they can see, each with its action flags.
// Only pages with can_view = true are returned, plus the ancestor groups needed
// to render them in the sidebar tree.
async function loadUserPermissions(userId) {
  const { rows: urows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.role_id, r.name AS role_name
       FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [userId],
  );
  const user = urows[0];
  if (!user) return null;

  const { rows: pages } = await pool.query(
    `SELECT p.id, p.name, p.route, p.parent_id, p.icon, p.sort_order,
            p.has_view, p.has_add, p.has_edit, p.has_delete, p.has_status, p.has_download,
            COALESCE(rp.can_view,false)     AS can_view,
            COALESCE(rp.can_add,false)      AS can_add,
            COALESCE(rp.can_edit,false)     AS can_edit,
            COALESCE(rp.can_delete,false)   AS can_delete,
            COALESCE(rp.can_status,false)   AS can_status,
            COALESCE(rp.can_download,false) AS can_download
       FROM pages p
       LEFT JOIN role_permissions rp ON rp.page_id = p.id AND rp.role_id = $1
      WHERE p.is_active = true AND p.is_deleted = false
      ORDER BY p.sort_order, p.id`,
    [user.role_id],
  );

  const byId = new Map(pages.map((p) => [p.id, p]));
  const keep = new Set();
  for (const p of pages) {
    if (p.can_view) {
      keep.add(p.id);
      let parent = p.parent_id;
      while (parent && !keep.has(parent)) { keep.add(parent); parent = byId.get(parent)?.parent_id; }
    }
  }
  const visible = pages.filter((p) => keep.has(p.id));
  return { user, pages: visible };
}

// Express middleware factory: enforce a permission for a page route + action.
// action ∈ view|add|edit|delete|status|download
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

module.exports = { loadUserPermissions, requirePermission };
