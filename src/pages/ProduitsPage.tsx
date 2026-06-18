import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/produits',            label: 'Produits',   end: true },
  { to: '/produits/categories', label: 'Catégories'           },
  { to: '/produits/unites',     label: 'Unités'               },
];

export default function ProduitsPage() {
  return (
    <div className="-mt-6 md:-mt-8 flex flex-col min-h-full">
      {/*
        Le tab bar doit être bord-à-bord dans la colonne de contenu.
        AppLayout ajoute px-4 md:px-8 ; on l'annule ici avec -mx-4 md:-mx-8,
        puis on réapplique le même padding à l'intérieur.
      */}
      <div className="-mx-4 md:-mx-8 sticky top-14 z-[9] bg-surface border-b border-line">
        <div className="flex px-4 md:px-8">
          {TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-muted hover:text-ink',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
