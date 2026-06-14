import { useAuth } from '../contexts/AuthContext';
import { useBoutique } from '../contexts/BoutiqueContext';
import { CaisseIcon, ProduitsIcon, ClientsIcon, StockIcon } from '../components/ui/icons';
import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';

const ROLE_LABEL: Record<string, string> = {
  owner:    'Propriétaire',
  employee: 'Employé',
};

interface QuickLink {
  path:        string;
  label:       string;
  description: string;
  Icon:        ComponentType<{ className?: string }>;
}

const QUICK_LINKS: QuickLink[] = [
  { path: '/caisse',   label: 'Caisse',   description: 'Enregistrer une vente', Icon: CaisseIcon },
  { path: '/produits', label: 'Produits', description: 'Gérer le catalogue',     Icon: ProduitsIcon },
  { path: '/clients',  label: 'Clients',  description: 'Consulter les clients',  Icon: ClientsIcon },
  { path: '/stock',    label: 'Stock',    description: 'Suivre les niveaux',     Icon: StockIcon },
];

const STATS = [
  { label: "Ventes aujourd'hui", value: '—' },
  { label: 'Recette du jour',    value: '—' },
  { label: 'Clients actifs',     value: '—' },
  { label: 'Alertes stock',      value: '—' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBoutique, isAllBoutiques, isOwner } = useBoutique();

  const scopeLabel = isOwner
    ? isAllBoutiques ? 'Tout le réseau' : activeBoutique?.name ?? '—'
    : activeBoutique?.name ?? '—';

  return (
    <div className="py-6 md:py-8 space-y-8">

      {/* Header */}
      <div>
        <p className="text-sm text-muted">{greeting()}</p>
        <h1 className="font-display text-2xl font-bold text-ink">Tableau de bord</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {user && (
            <span className="inline-block px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 text-xs font-medium">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          )}
          <span className="inline-block px-2 py-0.5 rounded-full bg-canvas border border-line text-muted text-xs font-medium">
            {scopeLabel}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value }) => (
          <div key={label} className="bg-surface rounded-card shadow-card p-5">
            <p className="text-xs text-muted leading-tight">{label}</p>
            <p className="font-mono text-3xl font-medium text-ink mt-2">{value}</p>
            <p className="text-[10px] text-muted mt-1 truncate">{scopeLabel}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
          Accès rapide
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map(({ path, label, description, Icon }) => (
            <Link
              key={path}
              to={path}
              className="flex flex-col gap-3 bg-surface rounded-card shadow-card p-5 hover:shadow-md active:bg-brand-50 transition-all"
            >
              <Icon className="w-6 h-6 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="text-xs text-muted mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
