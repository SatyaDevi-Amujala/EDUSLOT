// Controlled status pill/switch. active: boolean; onToggle(); disabled hides interactivity.
export default function StatusToggle({ active, onToggle, disabled }) {
  return (
    <button
      type="button" disabled={disabled} onClick={onToggle}
      title={disabled ? undefined : active ? 'Click to deactivate' : 'Click to activate'}
      className={`inline-flex items-center gap-2 rounded-full px-1 transition ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span className={`relative h-5 w-9 rounded-full transition ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${active ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span className={`text-xs font-medium ${active ? 'text-emerald-600' : 'text-slate-400'}`}>{active ? 'Active' : 'Inactive'}</span>
    </button>
  );
}
