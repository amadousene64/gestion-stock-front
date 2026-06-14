import { Outlet } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import SideNav from './SideNav';
import BottomNav from './BottomNav';
import BoutiqueSelector from '../components/BoutiqueSelector';
import UserMenu from '../components/UserMenu';

export default function AppLayout() {
  const { tenant } = useTenant();
  const commerceName = tenant?.name ?? 'Mon Commerce';

  return (
    <div className="min-h-dvh bg-canvas">
      <SideNav />

      <div className="md:pl-64 flex flex-col min-h-dvh">
        <header className="sticky top-0 z-10 bg-surface border-b border-line">
          <div className="flex items-center justify-between h-14 px-4 gap-3">

            {/* Mobile : nom du commerce + sélecteur boutique */}
            <div className="flex flex-col justify-center gap-0.5 md:hidden mr-auto min-w-0">
              <span className="font-display font-bold text-base leading-none text-ink truncate">
                {commerceName}
              </span>
              <BoutiqueSelector variant="header" />
            </div>

            {/* Desktop : spacer pour pousser le menu à droite */}
            <span className="hidden md:block flex-1" />

            {/* Menu utilisateur — remplace le bouton logout */}
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 pb-[72px] md:pb-0">
          <div className="w-full max-w-7xl px-4 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
