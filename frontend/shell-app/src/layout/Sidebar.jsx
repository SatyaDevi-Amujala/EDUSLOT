import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '../ui/icons';
import { usePermissions } from '../access/PermissionContext';

function Leaf({ node }) {
  return (
    <NavLink
      to={node.route}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition
         ${isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}`}
    >
      <Icon name={node.icon} className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{node.name}</span>
    </NavLink>
  );
}

function Group({ node }) {
  const location = useLocation();
  const childActive = node.children.some((c) => c.route && location.pathname.startsWith(c.route));
  const [open, setOpen] = useState(childActive);

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition
          ${childActive ? 'text-white' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}`}>
        <Icon name={node.icon} className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 truncate text-left">{node.name}</span>
        <svg className={`h-4 w-4 transition ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
      </button>
      {open && (
        <div className="ml-3 mt-1 space-y-1 border-l border-slate-700 pl-3">
          {node.children.map((c) => <NodeRenderer key={c.id} node={c} />)}
        </div>
      )}
    </div>
  );
}

function NodeRenderer({ node }) {
  if (node.children && node.children.length) return <Group node={node} />;
  if (node.route) return <Leaf node={node} />;
  return null; // empty group with no visible children
}

export default function Sidebar() {
  const { tree } = usePermissions();
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-slate-800">
      <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white font-bold">E</div>
        <span className="text-base font-semibold text-white">EduSlot</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {tree.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">No pages assigned</p>}
        {tree.map((n) => <NodeRenderer key={n.id} node={n} />)}
      </nav>
    </aside>
  );
}
