import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'bbs.token';
const AUTH_CHANGED = 'bbs:auth-changed';

// ── Authenticated fetch helper (shared by every page in every remote) ────────
export function useApi() {
  return useMemo(() => {
    const request = async (method, path, body) => {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body != null ? JSON.stringify(body) : undefined,
      });
      if (res.status === 204) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    };
    return {
      base: API,
      get: (p) => request('GET', p),
      post: (p, b) => request('POST', p, b),
      put: (p, b) => request('PUT', p, b),
      patch: (p, b) => request('PATCH', p, b),
      del: (p) => request('DELETE', p),
    };
  }, []);
}

// ── Permission context: loads /auth/permissions and exposes the page tree ────
const PermissionContext = createContext(null);

function buildTree(pages) {
  const byId = new Map(pages.map((p) => [p.id, { ...p, children: [] }]));
  const roots = [];
  for (const p of byId.values()) {
    if (p.parent_id && byId.has(p.parent_id)) byId.get(p.parent_id).children.push(p);
    else roots.push(p);
  }
  const sortRec = (arr) => {
    arr.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function PermissionProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [state, setState] = useState({ loading: false, user: null, pages: [], tree: [], byRoute: {} });

  useEffect(() => {
    const sync = () => setToken(localStorage.getItem(TOKEN_KEY));
    window.addEventListener('storage', sync);
    window.addEventListener(AUTH_CHANGED, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(AUTH_CHANGED, sync);
    };
  }, []);

  const load = useCallback(async () => {
    if (!token) { setState({ loading: false, user: null, pages: [], tree: [], byRoute: {} }); return; }
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`${API}/auth/permissions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const byRoute = {};
      for (const p of data.pages) if (p.route) byRoute[p.route] = p;
      setState({ loading: false, user: data.user, pages: data.pages, tree: buildTree(data.pages), byRoute });
    } catch {
      setState({ loading: false, user: null, pages: [], tree: [], byRoute: {} });
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => ({
    ...state,
    refresh: load,
    // perms for a given page route: { can_view, can_add, can_edit, can_delete, can_status, can_download }
    can: (route) => state.byRoute[route] || {},
  }), [state, load]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used inside <PermissionProvider>');
  return ctx;
}

// Convenience hook for a single page's action flags.
export function usePermission(route) {
  const { can } = usePermissions();
  return can(route);
}
