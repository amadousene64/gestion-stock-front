import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, MessageCircle, CheckCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useTenant } from '../contexts/TenantContext';
import Card from '../components/ui/Card';

// ─── NUMÉROS À REMPLACER — un seul endroit ──────────────────────────────────
const CONTACT = {
  ORANGE_MONEY: '+221 77 535 06 49',
  WAVE:         '+221 77 535 06 49',
  WHATSAPP:     '+221 77 535 06 49',
} as const;
// ────────────────────────────────────────────────────────────────────────────

type BillingPeriod = 'monthly' | 'annual';

interface FeatureRow {
  label:    string;
  free:     boolean;
  pro:      boolean;
  business: boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { label: 'Caisse & enregistrement des ventes', free: true,  pro: true,  business: true  },
  { label: 'Gestion des clients',                free: true,  pro: true,  business: true  },
  { label: 'Gestion du stock',                   free: true,  pro: true,  business: true  },
  { label: 'Suivi des dépenses',                 free: true,  pro: true,  business: true  },
  { label: 'Factures PDF professionnelles',      free: false, pro: true,  business: true  },
  { label: 'Pro-formas & devis',                 free: false, pro: true,  business: true  },
  { label: 'Espace client en ligne',             free: false, pro: true,  business: true  },
  { label: 'Gestion des employés',               free: false, pro: true,  business: true  },
  { label: 'Statistiques avancées',              free: false, pro: true,  business: true  },
  { label: 'Export des données (Excel/CSV)',     free: false, pro: true,  business: true  },
  { label: 'Boutiques & utilisateurs illimités', free: false, pro: false, business: true  },
  { label: 'Produits & ventes illimités',        free: false, pro: false, business: true  },
];

function fmtFCFA(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function AbonnementPage() {
  const sub        = useSubscription();
  const { tenant } = useTenant();
  const [billing, setBilling] = useState<BillingPeriod>('monthly');

  const { monthlyFcfa, annualFcfa, businessMonthlyFcfa, businessAnnualFcfa } = sub.limits;

  const isOnFreeTier     = sub.tier === 'free';
  const isOnProTier      = sub.tier === 'pro';
  const isOnBusinessTier = sub.tier === 'business' || sub.tier === 'paid';
  const isLifetime       = sub.billingCycle === 'lifetime';

  const proSavings = monthlyFcfa && annualFcfa
    ? Math.round((1 - annualFcfa / (monthlyFcfa * 12)) * 100)
    : null;

  const commerceName = tenant?.name ?? 'mon commerce';
  const waContact    = CONTACT.WHATSAPP.replace(/\D/g, '');

  const proPrice = billing === 'monthly' ? monthlyFcfa : annualFcfa;
  const bizPrice = billing === 'monthly' ? businessMonthlyFcfa : businessAnnualFcfa;

  const waMsgPro = encodeURIComponent(
    `Bonjour, je souhaite souscrire à la formule Pro ${billing === 'monthly' ? 'Mensuelle' : 'Annuelle'}` +
    ` (${fmtFCFA(proPrice)}/${billing === 'monthly' ? 'mois' : 'an'}). Commerce : ${commerceName}`
  );
  const waMsgBiz = encodeURIComponent(
    `Bonjour, je souhaite souscrire à la formule Business ${billing === 'monthly' ? 'Mensuelle' : 'Annuelle'}` +
    ` (${fmtFCFA(bizPrice)}/${billing === 'monthly' ? 'mois' : 'an'}). Commerce : ${commerceName}`
  );

  const waUrlPro = `https://wa.me/${waContact}?text=${waMsgPro}`;
  const waUrlBiz = `https://wa.me/${waContact}?text=${waMsgBiz}`;

  return (
    <div className="space-y-8">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Offres & tarifs</h1>
        <p className="text-sm text-muted mt-1">
          {sub.status === 'trial'   && 'Votre essai est en cours. Passez à Pro ou Business pour conserver tous vos accès.'}
          {sub.status === 'free'    && 'Débloquez toutes les fonctionnalités pour développer votre activité.'}
          {sub.status === 'grace'   && 'Votre abonnement a expiré. Renouvelez pour continuer sans interruption.'}
          {sub.status === 'expired' && "Accès bloqué. Renouvelez maintenant pour reprendre l'activité."}
          {sub.status === 'active'  && (
            isLifetime
              ? 'Abonnement à vie — aucune expiration.'
              : `Abonnement actif · expire le ${fmtDate(sub.expiresAt)}.`
          )}
        </p>
      </div>

      {/* ── Toggle mensuel / annuel ───────────────────────────────────────── */}
      {!isLifetime && (
        <div
          className="flex items-center gap-1 bg-canvas border border-line rounded-control p-1 w-fit"
          role="group"
          aria-label="Période de facturation"
        >
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
              billing === 'monthly'
                ? 'bg-surface text-ink shadow-card'
                : 'text-muted hover:text-ink'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors flex items-center gap-2 ${
              billing === 'annual'
                ? 'bg-surface text-ink shadow-card'
                : 'text-muted hover:text-ink'
            }`}
          >
            Annuel
            {proSavings != null && (
              <span className="text-[10px] font-bold bg-success text-white px-1.5 py-0.5 rounded-full leading-none">
                −{proSavings} %
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Comparatif des formules ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

        {/* Plan Gratuit */}
        <Card className={`p-5 flex flex-col border-2 ${isOnFreeTier ? 'border-brand-500' : 'border-line'}`}>
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gratuit</p>
            {isOnFreeTier && <CurrentBadge />}
          </div>

          <p className="font-display text-2xl font-bold text-ink">0&nbsp;FCFA</p>
          <p className="text-xs text-muted mb-1">pour toujours</p>
          <p className="text-xs text-muted mb-5">
            1 boutique · 1 utilisateur · 20 produits · 100 ventes/mois
          </p>

          <ul className="space-y-2">
            {FEATURE_ROWS.map(row => (
              <li
                key={row.label}
                className={`flex items-start gap-2 text-sm ${row.free ? 'text-ink' : 'text-muted/50'}`}
              >
                {row.free
                  ? <Check size={14} className="text-muted shrink-0 mt-0.5" />
                  : <X    size={14} className="text-line  shrink-0 mt-0.5" />
                }
                {row.label}
              </li>
            ))}
          </ul>
        </Card>

        {/* Plan Pro */}
        <Card className={`p-5 flex flex-col border-2 relative overflow-hidden ${
          isOnProTier ? 'border-brand-500' : 'border-brand-500'
        }`}>
          {!isOnProTier && !isOnBusinessTier && (
            <span className="absolute top-3 right-3 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Populaire
            </span>
          )}

          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Pro</p>
            {isOnProTier && <CurrentBadge />}
          </div>

          {isLifetime ? (
            <>
              <p className="font-display text-2xl font-bold text-ink">À vie</p>
              <p className="text-xs text-muted mb-5">aucune expiration</p>
            </>
          ) : billing === 'monthly' ? (
            <>
              <p className="font-display text-2xl font-bold text-ink">
                {fmtFCFA(monthlyFcfa)}
                <span className="text-sm font-normal text-muted">/mois</span>
              </p>
              <p className="text-xs text-muted mb-5">facturé mensuellement</p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-bold text-ink">
                {fmtFCFA(annualFcfa)}
                <span className="text-sm font-normal text-muted">/an</span>
              </p>
              <p className="text-xs text-muted">
                soit {fmtFCFA(monthlyFcfa && annualFcfa ? Math.round(annualFcfa / 12) : null)}/mois
              </p>
              <p className="text-xs font-semibold text-success mb-5">2 mois offerts</p>
            </>
          )}

          <ul className="space-y-2">
            {FEATURE_ROWS.map(row => (
              <li
                key={row.label}
                className={`flex items-start gap-2 text-sm ${row.pro ? 'text-ink' : 'text-muted/50'}`}
              >
                {row.pro
                  ? <Check size={14} className="text-brand-500 shrink-0 mt-0.5" />
                  : <X    size={14} className="text-line   shrink-0 mt-0.5" />
                }
                {row.label}
              </li>
            ))}
          </ul>
        </Card>

        {/* Plan Business */}
        <Card className={`p-5 flex flex-col border-2 ${isOnBusinessTier ? 'border-indigo-500' : 'border-indigo-300'}`}>
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Business</p>
            {isOnBusinessTier && <CurrentBadge color="indigo" />}
          </div>

          {isLifetime && isOnBusinessTier ? (
            <>
              <p className="font-display text-2xl font-bold text-ink">À vie</p>
              <p className="text-xs text-muted mb-5">aucune expiration</p>
            </>
          ) : billing === 'monthly' ? (
            <>
              <p className="font-display text-2xl font-bold text-ink">
                {fmtFCFA(businessMonthlyFcfa)}
                <span className="text-sm font-normal text-muted">/mois</span>
              </p>
              <p className="text-xs text-muted mb-5">facturé mensuellement</p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-bold text-ink">
                {fmtFCFA(businessAnnualFcfa)}
                <span className="text-sm font-normal text-muted">/an</span>
              </p>
              <p className="text-xs text-muted">
                soit {fmtFCFA(businessAnnualFcfa ? Math.round(businessAnnualFcfa / 12) : null)}/mois
              </p>
              <p className="text-xs font-semibold text-success mb-5">2 mois offerts</p>
            </>
          )}

          <ul className="space-y-2">
            {FEATURE_ROWS.map(row => (
              <li key={row.label} className="flex items-start gap-2 text-sm text-ink">
                <Check size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                {row.label}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── Comment payer ────────────────────────────────────────────────── */}
      {!isLifetime && (
        <Card className="p-5 sm:p-6 space-y-5">
          <h2 className="font-semibold text-ink">Comment payer ?</h2>

          <ol className="space-y-4">
            <li className="flex gap-3">
              <StepBadge n={1} />
              <div className="text-sm">
                <p className="font-medium text-ink">Envoyez le montant par mobile money</p>
                <p className="text-muted mt-1">
                  Par <strong>Orange Money</strong> au{' '}
                  <strong className="font-mono">{CONTACT.ORANGE_MONEY}</strong>
                  <br />
                  ou par <strong>Wave</strong> au{' '}
                  <strong className="font-mono">{CONTACT.WAVE}</strong>
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <StepBadge n={2} />
              <div className="text-sm">
                <p className="font-medium text-ink">Envoyez la preuve par WhatsApp</p>
                <p className="text-muted mt-1">
                  Envoyez la capture d'écran au{' '}
                  <strong className="font-mono">{CONTACT.WHATSAPP}</strong>
                  {' '}avec le nom de votre commerce et la formule choisie.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <StepBadge n={3} />
              <div className="text-sm">
                <p className="font-medium text-ink">Accès activé sous 24h</p>
                <p className="text-muted mt-1">
                  Votre compte est activé manuellement après vérification du paiement.
                </p>
              </div>
            </li>
          </ol>

          <div className="flex flex-col sm:flex-row gap-3">
            {!isOnProTier && !isOnBusinessTier && (
              <a
                href={waUrlPro}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm px-5 py-3 rounded-control hover:bg-[#1eb357] transition-colors"
              >
                <MessageCircle size={16} />
                Passer à Pro — {billing === 'monthly' ? `${fmtFCFA(monthlyFcfa)}/mois` : `${fmtFCFA(annualFcfa)}/an`}
              </a>
            )}

            {!isOnBusinessTier && (
              <a
                href={waUrlBiz}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm px-5 py-3 rounded-control hover:bg-indigo-700 transition-colors"
              >
                <MessageCircle size={16} />
                Passer à Business — {billing === 'monthly' ? `${fmtFCFA(businessMonthlyFcfa)}/mois` : `${fmtFCFA(businessAnnualFcfa)}/an`}
              </a>
            )}
          </div>
        </Card>
      )}

      {/* Retour si abonnement à vie */}
      {isLifetime && (
        <div className="text-center py-2">
          <Link
            to="/mon-abonnement"
            className="text-sm text-brand-500 hover:text-brand-600 font-medium"
          >
            ← Retour à mon abonnement
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function CurrentBadge({ color = 'brand' }: { color?: 'brand' | 'indigo' }) {
  const cls = color === 'indigo'
    ? 'bg-indigo-50 text-indigo-600'
    : 'bg-brand-50 text-brand-500';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none shrink-0 ${cls}`}>
      <CheckCircle size={10} />
      Votre formule
    </span>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
      {n}
    </span>
  );
}
