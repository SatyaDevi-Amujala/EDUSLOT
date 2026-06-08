import { useEffect, useMemo, useRef, useState } from 'react';

// options: [{ value, label }]; value: selected value; onChange(value)
export default function SingleSelect({
  label, options = [], value, onChange, placeholder = 'Select…',
  required, error, disabled, searchable = true, className = '',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options],
  );

  return (
    <div className={`block ${className}`} ref={ref}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      <button
        type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm transition
          disabled:bg-slate-50 disabled:text-slate-400
          ${error ? 'border-rose-400' : 'border-slate-300 hover:border-brand-400'} ${open ? 'ring-2 ring-brand-200' : ''}`}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>{selected ? selected.label : placeholder}</span>
        <svg className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="relative">
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-pop">
            {searchable && (
              <div className="border-b border-slate-100 p-2">
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400" />
              </div>
            )}
            <ul className="max-h-56 overflow-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No options</li>}
              {filtered.map((o) => {
                const active = String(o.value) === String(value);
                return (
                  <li key={o.value}>
                    <button type="button"
                      onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50
                        ${active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'}`}>
                      {o.label}
                      {active && <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </div>
  );
}
