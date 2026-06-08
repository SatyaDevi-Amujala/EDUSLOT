export default function Input({
  label, error, hint, required, className = '', id, ...rest
}) {
  const inputId = id || rest.name || label;
  return (
    <label className={`block ${className}`} htmlFor={inputId}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      <input
        id={inputId}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition
          placeholder:text-slate-400 focus:ring-2
          ${error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-brand-400 focus:ring-brand-200'}`}
        {...rest}
      />
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span>
             : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}
