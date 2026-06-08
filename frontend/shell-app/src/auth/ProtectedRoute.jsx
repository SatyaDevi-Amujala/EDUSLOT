import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#6b7280' }}>
        403 — requires role: {roles.join(' or ')}
      </div>
    );
  }
  return children;
}
