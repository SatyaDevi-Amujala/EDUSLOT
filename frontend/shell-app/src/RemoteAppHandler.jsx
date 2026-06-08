import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import Spinner from './ui/Spinner';

// Each remote owns its own sub-routing; we pick the remote by the path prefix.
const remotes = {
  admin: lazy(() => import('admin/App')),
  enroll: lazy(() => import('enroll/App')),
};

const ADMIN_PREFIXES = ['masters', 'roles', 'users'];
const ENROLL_PREFIXES = ['courses', 'enrollments'];

function pick(pathname) {
  const seg = pathname.split('/')[1] || '';
  if (ADMIN_PREFIXES.includes(seg)) return 'admin';
  if (ENROLL_PREFIXES.includes(seg)) return 'enroll';
  return null;
}

export default function RemoteAppHandler() {
  const location = useLocation();
  const which = pick(location.pathname);
  const Remote = which ? remotes[which] : null;

  if (!Remote) return <div className="p-8 text-slate-400">Page not found.</div>;
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Spinner label="Loading module…" /></div>}>
      <Remote />
    </Suspense>
  );
}
