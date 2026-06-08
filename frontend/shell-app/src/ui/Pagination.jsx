export default function Pagination({ page, limit, total, onPage, onLimit }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const nums = [];
  const push = (n) => nums.push(n);
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  if (start > 1) { push(1); if (start > 2) push('…'); }
  for (let i = start; i <= end; i++) push(i);
  if (end < pages) { if (end < pages - 1) push('…'); push(pages); }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <select value={limit} onChange={(e) => onLimit(Number(e.target.value))}
          className="rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-brand-400">
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="ml-2 text-slate-500">{from}–{to} of {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}
          className="rounded-md border border-slate-300 px-2.5 py-1 disabled:opacity-40 hover:bg-slate-50">‹</button>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="px-2 text-slate-400">…</span>
          : <button key={n} onClick={() => onPage(n)}
              className={`min-w-[34px] rounded-md border px-2.5 py-1 ${n === page ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' : 'border-slate-300 hover:bg-slate-50'}`}>{n}</button>)}
        <button disabled={page >= pages} onClick={() => onPage(page + 1)}
          className="rounded-md border border-slate-300 px-2.5 py-1 disabled:opacity-40 hover:bg-slate-50">›</button>
      </div>
    </div>
  );
}
