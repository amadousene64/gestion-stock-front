import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Star, AlertTriangle, XCircle, Infinity, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import type { SubscriptionStatus, SubscriptionEvent } from '../types/admin';
import { isLifetime } from '../types/admin';

interface MySubscriptionResponse {
  subscription: SubscriptionStatus;
  events: SubscriptionEvent[];
}

// ── Libellés ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  trial:   'Essai gratuit',
  free:    'Formule gratuite',
  active:  'Abonnement actif',
  grace:   'Période de grâce',
  expired: 'Expiré',
};

const TIER_LABEL: Record<string, string> = {
  trial: 'Essai',
  free:  'Gratuit',
  pro:   'Pro',
};

const BILLING_LABEL: Record<string, string> = {
  monthly:  'Mensuel',
  annual:   'Annuel',
  lifetime: 'À vie',
};

const EVENT_LABEL: Record<string, string> = {
  trial_started:           "Début de l'essai",
  trial_ended_downgraded:  'Fin d\'essai · passage au gratuit',
  activated:               'Abonnement activé',
  grace_started:           'Période de grâce démarrée',
  expired:                 'Abonnement expiré',
};

const FEATURE_LABEL: Record<string, string> = {
  CAISSE:       'Caisse',
  CLIENTS:      'Clients',
  STOCK:        'Stock',
  DEPENSES:     'Dépenses',
  STATS:        'Statistiques',
  EMPLOYEES:    'Employés',
  PDF_INVOICES: 'Factures PDF',
  PROFORMAS:    'Pro-formas',
  EXPORT:       'Export données',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatAmount(amount: number | null, currency = 'FCFA'): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('fr-FR')} ${currency}`;
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function MonAbonnementPage() {
  const [data, setData]       = useState<MySubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    api.get<MySubscriptionResponse>('/api/subscription')
      .then(r => setData(r.data))
      .catch(() => setError("Impossible de charger les informations d'abonnement."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted text-sm">
        Chargement…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <p className="text-danger">{error ?? "Une erreur est survenue."}</p>
      </div>
    );
  }

  const { subscription: sub, events } = data;
  const lifetime = isLifetime(sub);
  const needsUpgrade = sub.status === 'trial' || sub.status === 'free';
  const isExpiring   = sub.status === 'trial' && sub.daysLeft != null && sub.daysLeft <= 7;
  const isGrace      = sub.status === 'grace';
  const isExpired    = sub.status === 'expired';

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold text-ink">Mon abonnement</h1>

      {/* ── Carte formule actuelle ─────────────────────────────────────── */}
      <section className="bg-surface rounded-card border border-line overflow-hidden">
        {/* En-tête coloré selon statut */}
        <div className={`px-5 py-4 flex items-center gap-3 ${
          isExpired          ? 'bg-red-50 border-b border-red-100' :
          isGrace            ? 'bg-orange-50 border-b border-orange-100' :
          isExpiring         ? 'bg-amber-50 border-b border-amber-100' :
          sub.status === 'active' ? 'bg-green-50 border-b border-green-100' :
          'bg-canvas border-b border-line'
        }`}>
          <StatusIcon status={sub.status} />
          <div>
            <p className="font-semibold text-ink text-sm">
              {STATUS_LABEL[sub.status] ?? sub.status}
            </p>
            <p className="text-xs text-muted">
              Formule <strong>{TIER_LABEL[sub.tier] ?? sub.tier}</strong>
              {sub.billingCycle && ` · ${BILLING_LABEL[sub.billingCycle] ?? sub.billingCycle}`}
            </p>
          </div>
        </div>

        {/* Détails */}
        <div className="px-5 py-4 space-y-3">
          {/* Expiration / À vie */}
          <Row
            label="Validité"
            value={
              lifetime
                ? <span className="flex items-center gap-1 text-purple-600 font-semibold"><Infinity size={14} />À vie</span>
                : sub.status === 'trial' && sub.trialEndsAt
                ? `Essai jusqu'au ${formatDate(sub.trialEndsAt)}`
                : sub.expiresAt
                ? `Expire le ${formatDate(sub.expiresAt)}`
                : '—'
            }
          />

          {/* Jours restants */}
          {!lifetime && sub.daysLeft != null && (
            <Row
              label="Jours restants"
              value={
                <span className={sub.daysLeft <= 3 ? 'text-danger font-semibold' : sub.daysLeft <= 7 ? 'text-warning font-semibold' : 'text-ink'}>
                  {sub.daysLeft} j
                </span>
              }
            />
          )}

          {/* Fonctionnalités incluses */}
          <div>
            <p className="text-xs text-muted mb-2">Fonctionnalités incluses</p>
            <div className="flex flex-wrap gap-1.5">
              {sub.limits.features.map(f => (
                <span
                  key={f}
                  className="px-2 py-0.5 rounded-full bg-canvas border border-line text-xs text-ink"
                >
                  {FEATURE_LABEL[f] ?? f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA upgrade (essai / gratuit) ─────────────────────────────── */}
      {needsUpgrade && (
        <section className={`rounded-card border p-5 space-y-3 ${
          isExpiring ? 'border-amber-200 bg-amber-50' : 'border-line bg-surface'
        }`}>
          <p className="font-semibold text-ink text-sm">
            {isExpiring
              ? `Plus que ${sub.daysLeft} jour${sub.daysLeft === 1 ? '' : 's'} d'essai`
              : 'Passez à la formule Pro'}
          </p>
          <p className="text-xs text-muted">
            Déverrouillez les statistiques, exports, factures PDF, pro-formas et la gestion des employés.
          </p>
          <Link
            to="/abonnement"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            Voir les offres <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {/* ── Alerte grâce / expiré ────────────────────────────────────── */}
      {(isGrace || isExpired) && (
        <section className={`rounded-card border p-5 space-y-3 ${
          isExpired ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
        }`}>
          <p className={`font-semibold text-sm ${isExpired ? 'text-red-700' : 'text-orange-700'}`}>
            {isExpired ? 'Accès bloqué' : 'Abonnement en période de grâce'}
          </p>
          <p className="text-xs text-muted">
            {isExpired
              ? `Votre abonnement a expiré. Renouvelez-le pour retrouver l'accès complet.`
              : `Votre abonnement a expiré. Vous bénéficiez d'une période de grâce. Renouvelez avant que l'accès soit bloqué.`}
          </p>
          <Link
            to="/abonnement"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            Renouveler <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {/* ── Historique ────────────────────────────────────────────────── */}
      {events.length > 0 && (
        <section>
          <h2 className="font-display text-base font-semibold text-ink mb-3">Historique</h2>
          <div className="bg-surface rounded-card border border-line divide-y divide-line">
            {events.map(ev => (
              <div key={ev.id} className="px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">
                    {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                  </span>
                  <span className="text-xs text-muted whitespace-nowrap shrink-0">
                    {formatDate(ev.createdAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                  {ev.tier && (
                    <span>Formule : <strong className="text-ink">{TIER_LABEL[ev.tier] ?? ev.tier}</strong></span>
                  )}
                  {ev.billingCycle && (
                    <span>{BILLING_LABEL[ev.billingCycle] ?? ev.billingCycle}</span>
                  )}
                  {ev.amountPaid != null && (
                    <span>Montant : <strong className="text-ink">{formatAmount(ev.amountPaid)}</strong></span>
                  )}
                  {ev.paymentMethod && (
                    <span>Via {ev.paymentMethod}</span>
                  )}
                  {ev.validUntil && (
                    <span>Jusqu'au {formatDate(ev.validUntil)}</span>
                  )}
                </div>
                {ev.notes && (
                  <p className="text-xs text-muted italic">{ev.notes}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className="text-sm text-ink text-right">{value}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'active':  return <CheckCircle size={20} className="text-green-500 shrink-0" />;
    case 'trial':   return <Star        size={20} className="text-brand-500 shrink-0" />;
    case 'grace':   return <AlertTriangle size={20} className="text-orange-500 shrink-0" />;
    case 'expired': return <XCircle     size={20} className="text-danger shrink-0" />;
    default:        return <Clock       size={20} className="text-muted shrink-0" />;
  }
}
