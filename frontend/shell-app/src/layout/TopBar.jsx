import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../access/PermissionContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const { byRoute } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Page name = longest matching route prefix from the permission map.
  const match = Object.keys(byRoute)
    .filter((r) => location.pathname === r || location.pathname.startsWith(`${r}/`) || location.pathname.startsWith(r))
    .sort((a, b) => b.length - a.length)[0];
  const pageName = match ? byRoute[match].name : 'Dashboard';

  const onLogout = () => { logout(); navigate('/login'); };
  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-800">{pageName}</h1>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{initials}</span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-slate-700">{user?.name}</span>
            <span className="block text-xs leading-tight text-slate-400">{user?.email}</span>
          </span>
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button onClick={onLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
