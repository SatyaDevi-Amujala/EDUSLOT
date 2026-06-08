export default function Spinner({ className = 'w-5 h-5', label }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-500">
      <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}
