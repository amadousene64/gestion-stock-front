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

const TIER_LABELS: Record<string, string> = {
  trial:    'Essai',
  free:     'Gratuit',
  pro:      'Pro',
  business: 'Business',
  paid:     'Business', // alias historique
};
const EVENT_LABELS: Record<string, string> = {
  trial_started:           'Essai démarré',
  trial_ended_downgraded:  'Essai terminé → gratuit',
  activated:               'Abonnement activé',
  grace_started:           'Période de grâce',
  expired:                 'Expiré',
  suspended:               'Compte suspendu',
  reactivated:             'Compte réactivé',
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
  tier: 'pro',
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

  // Suspension
  const [suspendModal, setSuspendModal]   = useState(false);
  const [suspendMotif, setSuspendMotif]   = useState('');
  const [suspending, setSuspending]       = useState(false);
  const [suspendErr, setSuspendErr]       = useState('');
  const [reactivating, setReactivating]   = useState(false);
  const [reactivateConfirm, setReactivateConfirm] = useState(false);

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

  const handleSuspend = async () => {
    if (!id) return;
    setSuspending(true); setSuspendErr('');
    try {
      await adminApi.suspend(id, suspendMotif || undefined);
      setSuspendModal(false); setSuspendMotif('');
      load();
    } catch {
      setSuspendErr('Erreur lors de la suspension. Réessayez.');
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async () => {
    if (!id) return;
    setReactivating(true);
    try {
      await adminApi.reactivate(id);
      setReactivateConfirm(false);
      load();
    } catch {
      // silencieux — le rechargement ne se fait pas, l'admin peut réessayer
    } finally {
      setReactivating(false);
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <SubscriptionBadge status={sub.status} subscription={sub} />
          {sub.status === 'suspended' ? (
            reactivateConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Confirmer ?</span>
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-control hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  {reactivating ? 'Réactivation…' : 'Oui, réactiver'}
                </button>
                <button
                  onClick={() => setReactivateConfirm(false)}
                  className="text-xs text-muted hover:text-ink"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setReactivateConfirm(true)}
                className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-control hover:bg-green-100 transition-colors"
              >
                Réactiver
              </button>
            )
          ) : (
            <button
              onClick={() => { setSuspendModal(true); setSuspendErr(''); setSuspendMotif(''); }}
              className="text-xs font-semibold text-danger bg-red-50 border border-red-200 px-3 py-1.5 rounded-control hover:bg-red-100 transition-colors"
            >
              Suspendre
            </button>
          )}
        </div>
      </div>

      {/* Bandeau suspendu */}
      {sub.status === 'suspended' && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-card px-4 py-3">
          <span className="text-sm text-red-800">
            <strong>Compte suspendu.</strong> L'écriture est bloquée pour ce commerce. La lecture reste accessible.
            Utilisez le bouton "Réactiver" pour rétablir l'accès.
          </span>
        </div>
      )}

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
                { value: 'pro',      label: 'Pro' },
                { value: 'business', label: 'Business (illimité)' },
                { value: 'free',     label: 'Gratuit' },
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

      {/* Modale de suspension */}
      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-card shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-ink">Suspendre ce commerce</h2>
            <p className="text-sm text-muted">
              L'écriture sera <strong>bloquée immédiatement</strong> (ventes, produits, employés…).
              La lecture reste accessible. Cette action est <strong>réversible</strong>.
            </p>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Motif <span className="text-muted font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                value={suspendMotif}
                onChange={e => setSuspendMotif(e.target.value)}
                placeholder="Ex. Paiement en attente depuis 30 jours"
                className="w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>
            {suspendErr && (
              <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{suspendErr}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSuspendModal(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <button
                onClick={handleSuspend}
                disabled={suspending}
                className="flex-1 min-h-[44px] rounded-control bg-danger text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {suspending ? 'Suspension…' : 'Confirmer la suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
