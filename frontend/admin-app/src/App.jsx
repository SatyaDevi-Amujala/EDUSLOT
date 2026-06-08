import { useLocation } from 'react-router-dom';
import './index.css';
import States from './pages/States';
import Campuses from './pages/Campuses';
import Categories from './pages/Categories';
import Instructors from './pages/Instructors';
import Courses from './pages/Courses';
import Roles from './pages/Roles';
import Users from './pages/Users';

// The shell mounts this remote under several prefixes. We select the page from
// the full pathname (longest prefix wins) rather than nested <Routes>, which
// breaks under Module Federation in production builds.
const ROUTES = [
  ['/masters/states', States],
  ['/masters/campuses', Campuses],
  ['/masters/categories', Categories],
  ['/masters/instructors', Instructors],
  ['/masters/courses', Courses],
  ['/roles', Roles],
  ['/users', Users],
];

export default function App() {
  const { pathname } = useLocation();
  const match = ROUTES.find(([p]) => pathname === p || pathname.startsWith(p + '/'));
  const Page = match ? match[1] : null;
  return Page ? <Page /> : <div className="p-6 text-slate-400">Page not found.</div>;
}
