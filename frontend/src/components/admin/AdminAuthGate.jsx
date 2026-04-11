import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import AdminLoginPage from '../../pages/AdminLoginPage';

/**
 * /admin: password login if not an admin user; otherwise render child routes (Layout + AdminPage).
 */
export default function AdminAuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading…" />;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <AdminLoginPage />;
  }

  return <Outlet />;
}
