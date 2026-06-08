import { StatusToggle } from 'shell/ui';

// Reusable trailing cell: status toggle + edit + delete, each gated by perms.
export function RowActions({ row, perms, onEdit, onDelete, onToggle }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {perms.can_status && <StatusToggle active={row.is_active} onToggle={() => onToggle(row)} />}
      {perms.can_edit && (
        <button onClick={() => onEdit(row)} title="Edit"
          className="rounded-md p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-600">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
        </button>
      )}
      {perms.can_delete && (
        <button onClick={() => onDelete(row)} title="Delete"
          className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
        </button>
      )}
    </div>
  );
}
