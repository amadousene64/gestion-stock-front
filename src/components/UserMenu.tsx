import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';

const ROLE_LABEL: Record<string, string> = {
  owner:    'Propriétaire',
  employee: 'Employé',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { profile }      = useUserProfile();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false);
  const ref              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const isOwner     = user?.role === 'owner';
  const displayName = profile?.fullName ?? profile?.email ?? '…';
  const avatar      = profile?.fullName ? initials(profile.fullName) : (profile?.email?.[0]?.toUpperCase() ?? '…');
  const roleLabel   = ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '';

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menu utilisateur"
        aria-expanded={open}
        className="flex items-center gap-2 min-h-[44px] px-2 rounded-control hover:bg-canvas transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0 select-none">
          {avatar}
        </span>
        <span className="hidden sm:block text-sm font-medium text-ink max-w-[140px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-60 bg-surface rounded-card shadow-md border border-line z-50 overflow-hidden">

          {/* Infos utilisateur */}
          <div className="px-4 py-3 border-b border-line">
            <p className="font-semibold text-sm text-ink truncate">{displayName}</p>
            {profile?.email && (
              <p className="text-xs text-muted truncate mt-0.5">{profile.email}</p>
            )}
            <span className="mt-1.5 inline-block px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 text-[10px] font-medium">
              {roleLabel}
            </span>
          </div>

          {/* Navigation */}
          <div className="py-1">
            <Link
              to="/profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 min-h-[44px] text-sm text-ink hover:bg-canvas transition-colors"
            >
              <User size={16} className="text-muted shrink-0" />
              Mon profil
            </Link>
            {isOwner && (
              <Link
                to="/parametres-commerce"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 min-h-[44px] text-sm text-ink hover:bg-canvas transition-colors"
              >
                <Settings size={16} className="text-muted shrink-0" />
                Paramètres du commerce
              </Link>
            )}
            {isOwner && (
              <Link
                to="/mon-abonnement"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 min-h-[44px] text-sm text-ink hover:bg-canvas transition-colors"
              >
                <CreditCard size={16} className="text-muted shrink-0" />
                Mon abonnement
              </Link>
            )}
          </div>

          {/* Déconnexion */}
          <div className="border-t border-line py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 min-h-[44px] text-sm text-danger hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} className="shrink-0" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
