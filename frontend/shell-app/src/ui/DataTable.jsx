import Spinner from './Spinner';
import Pagination from './Pagination';

// columns: [{ key, header, render?(row), className?, width? }]
export default function DataTable({
  columns = [], rows = [], loading = false, emptyText = 'No records found',
  page, limit, total, onPage, onLimit, rowKey = 'id',
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 ${c.className || ''}`} style={c.width ? { width: c.width } : undefined}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center"><Spinner label="Loading…" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">{emptyText}</td></tr>
            ) : rows.map((row) => (
              <tr key={row[rowKey]} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.className || ''}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onPage && <div className="border-t border-slate-200"><Pagination page={page} limit={limit} total={total} onPage={onPage} onLimit={onLimit} /></div>}
    </div>
  );
}
