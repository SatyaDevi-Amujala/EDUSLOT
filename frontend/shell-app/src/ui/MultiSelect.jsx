import { useEffect, useMemo, useRef, useState } from 'react';

// options: [{ value, label }]; value: array of selected values; onChange(array)
export default function MultiSelect({
  label, options = [], value = [], onChange, placeholder = 'Select…',
  required, error, disabled, className = '',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const sel = new Set((value || []).map(String));

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options],
  );

  const toggle = (v) => {
    const next = new Set(sel);
    if (next.has(String(v))) next.delete(String(v)); else next.add(String(v));
    onChange(options.filter((o) => next.has(String(o.value))).map((o) => o.value));
  };
  const selectedLabels = options.filter((o) => sel.has(String(o.value)));

  return (
    <div className={`block ${className}`} ref={ref}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      <button
        type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        className={`flex min-h-[40px] w-full flex-wrap items-center gap-1 rounded-lg border bg-white px-2 py-1.5 text-left transition
          disabled:bg-slate-50 ${error ? 'border-rose-400' : 'border-slate-300 hover:border-brand-400'} ${open ? 'ring-2 ring-brand-200' : ''}`}
      >
        {selectedLabels.length === 0 && <span className="px-1 text-sm text-slate-400">{placeholder}</span>}
        {selectedLabels.map((o) => (
          <span key={o.value} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            {o.label}
            <span onClick={(e) => { e.stopPropagation(); toggle(o.value); }} className="cursor-pointer text-brand-400 hover:text-brand-700">×</span>
          </span>
        ))}
        <span className="ml-auto">
          <svg className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>
      {open && (
        <div className="relative">
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-pop">
            <div className="border-b border-slate-100 p-2">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <ul className="max-h-56 overflow-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No options</li>}
              {filtered.map((o) => {
                const active = sel.has(String(o.value));
                return (
                  <li key={o.value}>
                    <button type="button" onClick={() => toggle(o.value)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50 ${active ? 'text-brand-700 font-medium' : 'text-slate-700'}`}>
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300'}`}>
                        {active && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>}
                      </span>
                      {o.label}
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
