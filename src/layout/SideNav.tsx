import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { COMMON_ITEMS, OWNER_ITEMS } from './navItems';
import BoutiqueSelector from '../components/BoutiqueSelector';

export default function SideNav() {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const items = user?.role === 'owner'
    ? [...COMMON_ITEMS, ...OWNER_ITEMS]
    : COMMON_ITEMS;

  const commerceName = tenant?.name ?? 'Mon Commerce';

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 bg-surface border-r border-line z-20">
      {/* Nom du commerce (vrai nom depuis le tenant) */}
      <div className="flex items-center h-14 px-5 border-b border-line shrink-0">
        <span
          className="font-display font-bold text-lg text-ink truncate"
          title={commerceName}
        >
          {commerceName}
        </span>
      </div>

      {/* Sélecteur de boutique */}
      <div className="py-3 border-b border-line shrink-0">
        <BoutiqueSelector variant="sidebar" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map(({ path, label, Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-500'
                  : 'text-muted hover:bg-canvas hover:text-ink',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand-500' : 'text-muted'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
