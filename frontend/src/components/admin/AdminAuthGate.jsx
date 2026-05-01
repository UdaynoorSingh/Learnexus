import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import AdminLoginPage from '../../pages/AdminLoginPage';

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
