import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import type { AdminTenantSummary } from '../../types/admin';
import SubscriptionBadge from '../../components/admin/SubscriptionBadge';
import { isLifetime } from '../../types/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const TIER_LABELS: Record<string, string> = {
  trial: 'Essai',
  free:  'Gratuit',
  paid:  'Payant',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'trial',   label: 'Essai' },
  { value: 'active',  label: 'Actif' },
  { value: 'free',    label: 'Gratuit' },
  { value: 'grace',   label: 'Grâce' },
  { value: 'expired', label: 'Expiré' },
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminTenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants]   = useState<AdminTenantSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    adminApi.listTenants()
      .then(setTenants)
      .catch(() => setError('Impossible de charger la liste des commerces.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tenants.filter(t => {
      const matchName   = !q || t.name.toLowerCase().includes(q);
      const matchStatus = !statusFilter || t.subscription.status === statusFilter;
      return matchName && matchStatus;
    });
  }, [tenants, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Commerces</h1>
          <p className="text-sm text-muted mt-0.5">{tenants.length} commerce{tenants.length !== 1 ? 's' : ''} enregistré{tenants.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="min-h-[48px] rounded-control border border-line bg-surface px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Contenu */}
      {loading && (
        <p className="text-center text-muted py-16">Chargement…</p>
      )}

      {error && (
        <p className="text-center text-danger py-8">{error}</p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-center text-muted py-16">Aucun résultat</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          {/* Tableau desktop */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-muted text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Commerce</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold">Palier</th>
                  <th className="px-4 py-3 text-left font-semibold">Expiration</th>
                  <th className="px-4 py-3 text-left font-semibold">Jours restants</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-canvas transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{t.name}</div>
                      <div className="text-xs text-muted">{t.currency}</div>
                    </td>
                    <td className="px-4 py-3">
                      <SubscriptionBadge status={t.subscription.status} subscription={t.subscription} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {TIER_LABELS[t.subscription.tier] ?? t.subscription.tier}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {isLifetime(t.subscription) ? (
                        <span className="text-purple-700 font-semibold not-font-mono">∞ À vie</span>
                      ) : formatDate(t.subscription.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      {isLifetime(t.subscription) ? (
                        <span className="text-purple-700 font-semibold">∞</span>
                      ) : t.subscription.daysLeft != null ? (
                        <span className={`font-mono text-sm font-semibold ${
                          t.subscription.daysLeft <= 3 ? 'text-danger' :
                          t.subscription.daysLeft <= 7 ? 'text-warning' : 'text-ink'
                        }`}>
                          {t.subscription.daysLeft}j
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        className="min-h-[36px] px-4 text-sm"
                        onClick={() => navigate(`/admin/tenants/${t.id}`)}
                      >
                        Gérer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Cartes mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map(t => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{t.name}</div>
                    <div className="text-xs text-muted mt-0.5">{t.currency}</div>
                  </div>
                  <SubscriptionBadge status={t.subscription.status} subscription={t.subscription} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted text-xs">Palier</span>
                    <div className="font-medium">{TIER_LABELS[t.subscription.tier] ?? t.subscription.tier}</div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Expiration</span>
                    {isLifetime(t.subscription) ? (
                      <div className="text-purple-700 font-semibold">∞ À vie</div>
                    ) : (
                      <div className="font-mono text-xs">{formatDate(t.subscription.expiresAt)}</div>
                    )}
                  </div>
                  {!isLifetime(t.subscription) && t.subscription.daysLeft != null && (
                    <div>
                      <span className="text-muted text-xs">Jours restants</span>
                      <div className={`font-mono font-semibold ${
                        t.subscription.daysLeft <= 3 ? 'text-danger' :
                        t.subscription.daysLeft <= 7 ? 'text-warning' : 'text-ink'
                      }`}>
                        {t.subscription.daysLeft}j
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    className="w-full min-h-[40px] text-sm"
                    onClick={() => navigate(`/admin/tenants/${t.id}`)}
                  >
                    Gérer
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
