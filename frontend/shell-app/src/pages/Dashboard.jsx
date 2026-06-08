import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../access/PermissionContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { tree } = usePermissions();
  const count = (nodes) => nodes.reduce((n, x) => n + (x.route ? 1 : 0) + count(x.children || []), 0);

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 p-8 text-white shadow-card">
        <h2 className="text-2xl font-semibold">Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="mt-1 text-brand-100">You have access to {count(tree)} pages with your current role.</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tree.filter((t) => t.route || t.children?.length).map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <p className="text-sm font-semibold text-slate-700">{t.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              {t.children?.length ? `${t.children.length} sub-pages` : 'Quick access'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
