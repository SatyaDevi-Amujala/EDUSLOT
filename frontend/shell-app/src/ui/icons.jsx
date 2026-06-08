// Minimal stroke-icon set keyed by name. Used by the sidebar + buttons.
const paths = {
  dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 14h7v7H3z',
  masters: 'M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4z',
  states: 'M12 2l9 4-9 4-9-4 9-4zM3 12l9 4 9-4M3 17l9 4 9-4',
  branches: 'M6 3v12M6 21a3 3 0 100-6 3 3 0 000 6zM18 9a3 3 0 100-6 3 3 0 000 6zM18 6c0 6-12 3-12 9',
  depts: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h0M9 13h0M9 17h0M15 9h0M15 13h0M15 17h0',
  doctors: 'M12 11a4 4 0 100-8 4 4 0 000 8zM6 21v-1a4 4 0 014-4h4a4 4 0 014 4v1',
  roles: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z',
  users: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.87',
  appts: 'M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h0M3 12h0M3 18h0',
  plus: 'M12 5v14M5 12h14',
  page: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6',
};

export default function Icon({ name, className = 'w-5 h-5' }) {
  const d = paths[name] || paths.page;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
