import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-10 bg-brand-500 text-white shadow-md">
        <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-lg tracking-tight">Administration</span>
            <span className="hidden sm:inline text-brand-200 text-xs font-mono">super-admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-brand-100 truncate max-w-48">
              {user?.email ?? user?.fullName}
            </span>
            <Button
              variant="ghost"
              className="text-white hover:bg-brand-600 active:bg-brand-700 min-h-[36px] px-3 text-sm"
              onClick={handleLogout}
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
