import { useCallback, useEffect, useState } from 'react';
import { useApi } from 'shell/access';

// Shared list/search/pagination state machine for every master CRUD page.
export function useCrud(route) {
  const api = useApi();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page, limit, search });
    if (status) qs.set('status', status);
    try {
      const r = await api.get(`${route}?${qs.toString()}`);
      setData(r.data || []);
      setTotal(r.total || 0);
    } catch {
      setData([]); setTotal(0);
    } finally { setLoading(false); }
  }, [api, route, page, limit, search, status]);

  // Debounce so typing in the search box doesn't hammer the API.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return {
    api, data, total, loading,
    page, setPage, limit, setLimit, search, setSearch, status, setStatus,
    reload: load,
  };
}
