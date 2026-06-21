import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import type { AdminTenantDetail, ActivateSubscriptionRequest, SubscriptionEvent } from '../../types/admin';
import { isLifetime } from '../../types/admin';
import SubscriptionBadge from '../../components/admin/SubscriptionBadge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const TIER_LABELS: Record<string, string> = { trial: 'Essai', free: 'Gratuit', paid: 'Payant' };
const EVENT_LABELS: Record<string, string> = {
  trial_started:           'Essai démarré',
  trial_ended_downgraded:  'Essai terminé → gratuit',
  activated:               'Abonnement activé',
  grace_started:           'Période de grâce',
  expired:                 'Expiré',
};
const PAYMENT_LABELS: Record<string, string> = {
  orange_money_manual: 'Orange Money',
  wave_manual:         'Wave',
  cash:                'Espèces',
  other:               'Autre',
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const INITIAL_FORM: ActivateSubscriptionRequest = {
  tier: 'paid',
  billingCycle: 'monthly',
  durationMonths: 1,
  amountPaid: undefined,
  paymentMethod: 'wave_manual',
  paymentRef: '',
  notes: '',
};

export default function AdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant]     = useState<AdminTenantDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState<ActivateSubscriptionRequest>(INITIAL_FORM);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk]     = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    adminApi.getTenant(id)
      .then(setTenant)
      .catch(() => setError('Impossible de charger ce commerce.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleFormChange = <K extends keyof ActivateSubscriptionRequest>(
    key: K, value: ActivateSubscriptionRequest[K]
  ) => {
    setForm(f => ({ ...f, [key]: value }));
    setSaveError('');
    setSaveOk(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setSaveError('');
    setSaveOk(false);
    try {
      const isLifetimeBilling = form.billingCycle === 'lifetime';
      const payload: ActivateSubscriptionRequest = {
        ...form,
        durationMonths: (form.tier === 'free' || isLifetimeBilling) ? null : Number(form.durationMonths),
        amountPaid: form.amountPaid ? Number(form.amountPaid) : null,
        billingCycle: form.tier === 'free' ? null : form.billingCycle,
      };
      await adminApi.activateSubscription(id, payload);
      setSaveOk(true);
      load();
    } catch (err: unknown) {
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setSaveError(msg ?? 'Erreur lors de l\'activation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center text-muted py-16">Chargement…</p>;
  if (error)   return <p className="text-center text-danger py-8">{error}</p>;
  if (!tenant) return null;

  const sub = tenant.subscription;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin')}
          className="text-muted hover:text-ink transition-colors text-sm"
        >
          ← Retour
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{tenant.name}</h1>
          <p className="text-sm text-muted mt-0.5">Créé le {formatDate(tenant.createdAt)} · {tenant.currency}</p>
        </div>
        <SubscriptionBadge status={sub.status} subscription={sub} />
      </div>

      {/* Statut actuel */}
      <Card className="p-4 sm:p-6">
        <h2 className="font-semibold text-ink mb-4">Abonnement actuel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted text-xs mb-1">Statut</div>
            <SubscriptionBadge status={sub.status} subscription={sub} />
          </div>
          <div>
            <div className="text-muted text-xs mb-1">Palier</div>
            <div className="font-semibold">{TIER_LABELS[sub.tier] ?? sub.tier}</div>
          </div>
          <div>
            <div className="text-muted text-xs mb-1">Expiration</div>
            {isLifetime(sub) ? (
              <div className="text-purple-700 font-semibold">∞ À vie</div>
            ) : (
              <div className="font-mono text-xs">{formatDate(sub.expiresAt)}</div>
            )}
          </div>
          <div>
            <div className="text-muted text-xs mb-1">Jours restants</div>
            {isLifetime(sub) ? (
              <div className="text-purple-700 font-semibold text-lg">∞</div>
            ) : (
              <div className={`font-mono font-semibold ${
                (sub.daysLeft ?? 999) <= 3 ? 'text-danger' :
                (sub.daysLeft ?? 999) <= 7 ? 'text-warning' : 'text-ink'
              }`}>
                {sub.daysLeft != null ? `${sub.daysLeft}j` : '—'}
              </div>
            )}
          </div>
        </div>
        {sub.limits.features.length > 0 && (
          <div className="mt-4">
            <div className="text-muted text-xs mb-2">Fonctions actives</div>
            <div className="flex flex-wrap gap-1.5">
              {sub.limits.features.map(f => (
                <span key={f} className="text-xs bg-canvas border border-line rounded px-2 py-0.5 font-mono text-muted">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Formulaire d'activation */}
      <Card className="p-4 sm:p-6">
        <h2 className="font-semibold text-ink mb-4">Activer / Prolonger un abonnement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Palier"
              value={form.tier}
              onChange={e => handleFormChange('tier', e.target.value)}
              options={[
                { value: 'paid', label: 'Payant (illimité)' },
                { value: 'free', label: 'Gratuit (limité)' },
              ]}
            />
            {form.tier !== 'free' && (
              <Select
                label="Cycle de facturation"
                value={form.billingCycle ?? 'monthly'}
                onChange={e => handleFormChange('billingCycle', e.target.value)}
                options={[
                  { value: 'monthly',  label: 'Mensuel' },
                  { value: 'annual',   label: 'Annuel' },
                  { value: 'lifetime', label: 'À vie (sans expiration)' },
                ]}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.tier !== 'free' && form.billingCycle !== 'lifetime' && (
            <Input
              label="Durée (mois)"
              type="number"
              min={1}
              max={24}
              required
              value={form.durationMonths ?? ''}
              onChange={e => handleFormChange('durationMonths', Number(e.target.value))}
            />
            )}
            <Input
              label={`Montant reçu (FCFA)${form.tier === 'free' ? ' — optionnel' : ''}`}
              type="number"
              min={0}
              value={form.amountPaid ?? ''}
              onChange={e => handleFormChange('amountPaid', e.target.value ? Number(e.target.value) : undefined)}
              placeholder={form.tier === 'free' ? '0' : sub.limits.monthlyFcfa?.toString()}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Moyen de paiement"
              value={form.paymentMethod ?? ''}
              onChange={e => handleFormChange('paymentMethod', e.target.value || null)}
              placeholder="— Sélectionner —"
              options={[
                { value: 'orange_money_manual', label: 'Orange Money' },
                { value: 'wave_manual',         label: 'Wave' },
                { value: 'cash',                label: 'Espèces' },
                { value: 'other',               label: 'Autre' },
              ]}
            />
            <Input
              label="Référence / Note de paiement"
              type="text"
              value={form.paymentRef ?? ''}
              onChange={e => handleFormChange('paymentRef', e.target.value)}
              placeholder="Ex : Wave du 19/06, ref #ABC123"
            />
          </div>

          <Input
            label="Notes internes (optionnel)"
            type="text"
            value={form.notes ?? ''}
            onChange={e => handleFormChange('notes', e.target.value)}
            placeholder="Remarque, contexte…"
          />

          {saveError && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{saveError}</p>
          )}
          {saveOk && (
            <p className="text-sm text-success bg-green-50 rounded-control px-3 py-2">
              Abonnement activé avec succès.
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Activation…' : 'Activer / Prolonger'}
          </Button>
        </form>
      </Card>

      {/* Historique des événements */}
      {tenant.events.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h2 className="font-semibold text-ink mb-4">Historique</h2>
          <div className="space-y-3">
            {tenant.events.map((ev: SubscriptionEvent) => (
              <div key={ev.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-line last:border-0">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                    </div>
                    <div className="text-xs text-muted mt-0.5 space-x-2">
                      <span>Palier : {TIER_LABELS[ev.tier] ?? ev.tier}</span>
                      {ev.billingCycle && (
                        <span>· {ev.billingCycle === 'annual' ? 'Annuel' : ev.billingCycle === 'lifetime' ? 'À vie' : 'Mensuel'}</span>
                      )}
                      {ev.validUntil && <span>· jusqu'au {formatDate(ev.validUntil)}</span>}
                      {ev.billingCycle === 'lifetime' && !ev.validUntil && <span>· sans expiration</span>}
                    </div>
                    {(ev.amountPaid || ev.paymentMethod || ev.paymentRef) && (
                      <div className="text-xs text-muted mt-0.5">
                        {ev.amountPaid != null && <span>{ev.amountPaid.toLocaleString('fr-FR')} FCFA</span>}
                        {ev.paymentMethod && <span> · {PAYMENT_LABELS[ev.paymentMethod] ?? ev.paymentMethod}</span>}
                        {ev.paymentRef && <span> · {ev.paymentRef}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted font-mono whitespace-nowrap">
                  {formatDateTime(ev.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
