import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBoutique } from '../contexts/BoutiqueContext';
import { CaisseIcon, ProduitsIcon, ClientsIcon, StockIcon } from '../components/ui/icons';
import { dashboardApi } from '../services/dashboardApi';
import type { DashboardSummary, PaymentBreakdown } from '../types/dashboard';

interface QuickLink {
  path: string;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
}

const QUICK_LINKS: QuickLink[] = [
  { path: '/caisse',   label: 'Caisse',   description: 'Enregistrer une vente', Icon: CaisseIcon },
  { path: '/produits', label: 'Produits', description: 'Gérer le catalogue',    Icon: ProduitsIcon },
  { path: '/clients',  label: 'Clients',  description: 'Consulter les clients', Icon: ClientsIcon },
  { path: '/stock',    label: 'Stock',    description: 'Suivre les niveaux',    Icon: StockIcon },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function fmtFCFA(amount: number | undefined): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount ?? 0)) + ' F';
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function StatSkeleton() {
  return (
    <div className="bg-surface rounded-card shadow-card p-5 animate-pulse">
      <div className="h-3 bg-canvas rounded w-2/3 mb-3" />
      <div className="h-8 bg-canvas rounded w-1/2 mb-2" />
      <div className="h-2.5 bg-canvas rounded w-1/3" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBoutique, activeBoutiqueId, isAllBoutiques, isOwner } = useBoutique();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);  // clear stale data before each fetch
    setLoading(true);
    dashboardApi.getSummary(activeBoutiqueId)
      .then(data => { if (!cancelled) { setSummary(data); setError(null); } })
      .catch(() => { if (!cancelled) setError('Impossible de charger le tableau de bord'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeBoutiqueId]);

  const scopeLabel = isOwner
    ? (isAllBoutiques ? 'Tout le réseau' : activeBoutique?.name ?? '—')
    : (activeBoutique?.name ?? '—');

  const totalAlerts = summary
    ? summary.stockAlerts.outOfStock + summary.stockAlerts.lowStock
    : 0;

  const stats = summary
    ? [
        {
          label: "Ventes aujourd'hui",
          value: summary.salesToday.count.toString(),
          sub: summary.salesToday.count === 1 ? 'transaction' : 'transactions',
          danger: false,
          highlight: false,
        },
        {
          label: 'Chiffre d\'affaires',
          value: fmtFCFA(summary.salesToday.revenue),
          sub: 'comptant + crédit',
          danger: false,
          highlight: false,
        },
        {
          label: 'Encaissé aujourd\'hui',
          value: fmtFCFA(summary.collectedToday),
          sub: 'argent réellement reçu',
          danger: false,
          highlight: true,
        },
        {
          label: 'Clients actifs',
          value: summary.activeCustomers.toString(),
          sub: summary.activeCustomers === 1 ? 'client' : 'clients',
          danger: false,
          highlight: false,
        },
        {
          label: 'Alertes stock',
          value: totalAlerts.toString(),
          sub: summary.stockAlerts.outOfStock > 0
            ? `${summary.stockAlerts.outOfStock} rupture(s)`
            : totalAlerts > 0 ? 'produits à surveiller' : 'tout est OK',
          danger: summary.stockAlerts.outOfStock > 0,
          highlight: false,
        },
      ]
    : null;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-sm text-muted">{greeting()}</p>
        <h1 className="font-display text-2xl font-bold text-ink">Tableau de bord</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {user && (
            <span className="inline-block px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 text-xs font-medium">
              {user.role === 'owner' ? 'Propriétaire' : 'Employé'}
            </span>
          )}
          <span className="inline-block px-2 py-0.5 rounded-full bg-canvas border border-line text-muted text-xs font-medium">
            {scopeLabel}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
        ) : error ? (
          <div className="col-span-5 bg-surface rounded-card shadow-card p-5 text-center text-danger text-sm">
            {error}
          </div>
        ) : (
          stats!.map(({ label, value, sub, danger, highlight }) => (
            <div
              key={label}
              className={`rounded-card shadow-card p-5 ${
                highlight
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-surface'
              }`}
            >
              <p className="text-xs text-muted leading-tight">{label}</p>
              <p className={`font-mono text-3xl font-medium mt-2 ${
                danger ? 'text-danger' : highlight ? 'text-emerald-700' : 'text-ink'
              }`}>
                {value}
              </p>
              <p className="text-[10px] text-muted mt-1 truncate">{sub}</p>
            </div>
          ))
        )}
      </div>

      {/* Répartition des encaissements par mode de paiement */}
      {!loading && summary?.paymentBreakdown && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
            Répartition des encaissements
          </p>
          <div className="bg-surface rounded-card shadow-card px-4 py-4">
            <div className="grid grid-cols-3 divide-x divide-line">
              {([
                { label: 'Espèces',      key: 'cash' },
                { label: 'Orange Money', key: 'orangeMoney' },
                { label: 'Wave',         key: 'wave' },
              ] as Array<{ label: string; key: keyof PaymentBreakdown }>).map(({ label, key }) => (
                <div key={key} className="text-center px-3">
                  <p className="text-[10px] text-muted leading-tight">{label}</p>
                  <p className="font-mono text-base font-semibold text-ink mt-1">
                    {fmtFCFA(summary.paymentBreakdown![key])}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock alerts */}
      {!loading && summary && summary.stockAlerts.items.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
            Alertes stock
          </p>
          <div className="bg-surface rounded-card shadow-card divide-y divide-line">
            {summary.stockAlerts.items.slice(0, 8).map(item => (
              <div key={item.productId} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.alertLevel === 'out_of_stock' ? 'bg-danger' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-sm text-ink">{item.productName}</span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    item.alertLevel === 'out_of_stock' ? 'text-danger' : 'text-amber-500'
                  }`}
                >
                  {item.alertLevel === 'out_of_stock'
                    ? 'Rupture'
                    : `Faible (${item.totalQuantity})`}
                </span>
              </div>
            ))}
            {summary.stockAlerts.items.length > 8 && (
              <div className="px-4 py-3 text-xs text-muted text-center">
                +{summary.stockAlerts.items.length - 8} autres produits —{' '}
                <Link to="/stock" className="text-brand-500 hover:underline">voir le stock</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent sales + outstanding credit */}
      {!loading && summary && (
        summary.recentSales.length > 0 || summary.totalOutstandingCredit > 0
      ) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent sales */}
          {summary.recentSales.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
                Dernières ventes
              </p>
              <div className="bg-surface rounded-card shadow-card divide-y divide-line">
                {summary.recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                        {sale.customerName ?? 'Client comptant'}
                        {sale.credit && (
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded flex-shrink-0">
                            Crédit
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {sale.storeName} · {fmtDate(sale.createdAt)}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-ink font-medium flex-shrink-0">
                      {fmtFCFA(sale.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total outstanding credit */}
          {summary.totalOutstandingCredit > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
                Crédits clients en cours
              </p>
              <div className="bg-surface rounded-card shadow-card p-5">
                <p className="text-xs text-muted">Total dettes clients</p>
                <p className="font-mono text-3xl font-medium text-danger mt-2">
                  {fmtFCFA(summary.totalOutstandingCredit)}
                </p>
                <p className="text-xs text-muted mt-1">montant dû par les clients</p>
                <Link
                  to="/clients"
                  className="mt-4 inline-block text-xs text-brand-500 hover:underline"
                >
                  Voir les clients →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

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
