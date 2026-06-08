import { useLocation } from 'react-router-dom';
import './index.css';
import BrowseCourses from './pages/BrowseCourses';
import MyEnrollments from './pages/MyEnrollments';

// Page selected from the full pathname (see admin-app for why not nested Routes).
const ROUTES = [
  ['/courses', BrowseCourses],
  ['/enrollments', MyEnrollments],
];

export default function App() {
  const { pathname } = useLocation();
  const match = ROUTES.find(([p]) => pathname === p || pathname.startsWith(p + '/'));
  const Page = match ? match[1] : null;
  return Page ? <Page /> : <div className="p-6 text-slate-400">Page not found.</div>;
}
