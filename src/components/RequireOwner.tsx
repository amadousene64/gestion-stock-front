import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RequireOwner() {
  const { user } = useAuth();
  if (user?.role !== 'owner') return <Navigate to="/" replace />;
  return <Outlet />;
}
