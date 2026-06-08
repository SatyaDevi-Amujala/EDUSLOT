import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { PermissionProvider, usePermissions } from './access/PermissionContext';
import { ToastProvider } from './ui/Toast';
import Sidebar from './layout/Sidebar';
import TopBar from './layout/TopBar';
import RemoteAppHandler from './RemoteAppHandler';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Spinner from './ui/Spinner';

// First navigable route for the current role (so each user lands somewhere useful).
function firstRoute(tree) {
  for (const n of tree) {
    if (n.route) return n.route;
    if (n.children) { const r = firstRoute(n.children); if (r) return r; }
  }
  return '/dashboard';
}

function Shell() {
  const { user } = useAuth();
  const { loading, tree } = usePermissions();

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner label="Loading your workspace…" /></div>;

  const home = firstRoute(tree);
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/masters/*" element={<RemoteAppHandler />} />
            <Route path="/roles/*" element={<RemoteAppHandler />} />
            <Route path="/users/*" element={<RemoteAppHandler />} />
            <Route path="/courses/*" element={<RemoteAppHandler />} />
            <Route path="/enrollments/*" element={<RemoteAppHandler />} />
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/*" element={<Shell />} />
            </Routes>
          </ToastProvider>
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
