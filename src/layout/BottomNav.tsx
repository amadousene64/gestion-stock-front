import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { COMMON_ITEMS, OWNER_ITEMS } from './navItems';

export default function BottomNav() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const items = isOwner ? [...COMMON_ITEMS, ...OWNER_ITEMS] : COMMON_ITEMS;

  const itemBase =
    'flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1 transition-colors';
  const itemWidth = isOwner ? 'min-w-[72px]' : 'flex-1';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line md:hidden">
      <div className="flex overflow-x-auto scrollbar-none safe-area-pb">
        {items.map(({ path, label, Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              [itemBase, itemWidth, isActive ? 'text-brand-500' : 'text-muted'].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-6 h-6 ${isActive ? 'text-brand-500' : 'text-muted'}`} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
