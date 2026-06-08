import Button from './Button';
import Icon from './icons';

// Toolbar above a table: title, search box, optional filter slot, Add button.
export default function PageHeader({
  title, subtitle,
  search, onSearch, searchPlaceholder = 'Search…',
  onAdd, addLabel = 'Add', canAdd = true,
  filterSlot, children,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {title && <h1 className="text-xl font-semibold text-slate-800">{title}</h1>}
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onSearch && (
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder}
              className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200" />
          </div>
        )}
        {filterSlot}
        {children}
        {onAdd && canAdd && (
          <Button onClick={onAdd}><Icon name="plus" className="h-4 w-4" />{addLabel}</Button>
        )}
      </div>
    </div>
  );
}
