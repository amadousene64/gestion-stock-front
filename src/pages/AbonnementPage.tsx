import { Link } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/ui/Card';

// ── PLACEHOLDERS — remplacer par vos vrais numéros ──────────────────────────
const WHATSAPP_NUMBER  = '+221770000000';
const ORANGE_MONEY_NUM = '+221770000000';
const WAVE_NUM         = '+221770000000';
// ────────────────────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  'Caisse & enregistrement des ventes',
  'Gestion des clients',
  'Gestion du stock',
  'Suivi des dépenses',
];

const PRO_FEATURES = [
  'Tout le plan Gratuit',
  'Factures PDF professionnelles',
  'Pro-formas & devis',
  'Gestion des employés',
  'Statistiques avancées',
  'Export des données (Excel/CSV)',
  'Portail client en ligne',
  'Boutiques & utilisateurs illimités',
];

function fmtFCFA(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

export default function AbonnementPage() {
  const sub = useSubscription();
  const { monthlyFcfa, annualFcfa } = sub.limits;

  const waBase        = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`;
  const monthlyMsg    = encodeURIComponent(
    `Bonjour, je souhaite souscrire à la formule Pro Mensuelle (${fmtFCFA(monthlyFcfa)}/mois). Nom du commerce : …`
  );
  const annualMsg     = encodeURIComponent(
    `Bonjour, je souhaite souscrire à la formule Pro Annuelle (${fmtFCFA(annualFcfa)}/an). Nom du commerce : …`
  );
  const discountPct   = monthlyFcfa && annualFcfa
    ? Math.round((1 - annualFcfa / (monthlyFcfa * 12)) * 100)
    : null;

  const isAlreadyPro  = sub.status === 'active';

  return (
    <div className="space-y-8 max-w-2xl mx-auto">

      {/* En-tête */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold text-ink">
          {isAlreadyPro ? 'Votre abonnement' : 'Passer à Pro'}
        </h1>
        <p className="text-muted text-sm">
          {sub.status === 'free'    && 'Débloquez toutes les fonctionnalités pour développer votre activité.'}
          {sub.status === 'trial'   && `Votre essai se termine bientôt. Passez à Pro pour conserver tous vos accès.`}
          {sub.status === 'grace'   && 'Votre abonnement a expiré. Renouvelez pour continuer sans interruption.'}
          {sub.status === 'expired' && 'Abonnement expiré. Renouvelez maintenant pour reprendre l\'activité.'}
          {isAlreadyPro             && (sub.isLifetime ? 'Abonnement à vie — aucune expiration.' : `Expire le ${sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}`)}
        </p>
      </div>

      {/* Déjà actif */}
      {isAlreadyPro && (
        <Card className="p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto">
            <Check size={28} className="text-success" />
          </div>
          <p className="font-semibold text-ink text-lg">Abonnement actif</p>
          <p className="text-sm text-muted">
            {sub.isLifetime
              ? 'À vie — aucune expiration.'
              : `Expire le ${sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('fr-FR') : '—'}`}
          </p>
          <Link to="/" className="text-sm text-brand-500 font-semibold hover:text-brand-600">
            Retour au tableau de bord →
          </Link>
        </Card>
      )}

      {/* Plans */}
      {!isAlreadyPro && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">

            {/* Plan Gratuit */}
            <Card className="p-5 border-2 border-line">
              <div className="mb-4">
                <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Gratuit</p>
                <p className="font-display text-2xl font-bold text-ink">0 FCFA</p>
                <p className="text-xs text-muted">pour toujours</p>
              </div>
              <ul className="space-y-2">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <Check size={14} className="text-muted shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Plan Pro */}
            <Card className="p-5 border-2 border-brand-500 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Recommandé
                </span>
              </div>
              <div className="mb-4">
                <p className="text-xs text-brand-500 font-semibold uppercase tracking-wide mb-1">Pro</p>
                <p className="font-display text-2xl font-bold text-ink">
                  {fmtFCFA(monthlyFcfa)}
                  <span className="text-sm font-normal text-muted">/mois</span>
                </p>
                <p className="text-xs text-muted">
                  ou {fmtFCFA(annualFcfa)}/an
                  {discountPct != null && (
                    <span className="ml-1 text-success font-semibold">(-{discountPct}%)</span>
                  )}
                </p>
              </div>
              <ul className="space-y-2">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink">
                    <Check size={14} className="text-brand-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Instructions paiement */}
          <Card className="p-5 sm:p-6 space-y-5">
            <h2 className="font-semibold text-ink">Comment s'abonner ?</h2>

            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-medium text-ink">Envoyez le montant de votre choix</p>
                  <p className="text-muted mt-0.5">
                    Par <strong>Orange Money</strong> au <strong className="font-mono">{ORANGE_MONEY_NUM}</strong>
                    <br />
                    ou par <strong>Wave</strong> au <strong className="font-mono">{WAVE_NUM}</strong>
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-medium text-ink">Envoyez la capture d'écran par WhatsApp</p>
                  <p className="text-muted mt-0.5">
                    Envoyez la preuve de paiement au numéro WhatsApp{' '}
                    <strong className="font-mono">{WHATSAPP_NUMBER}</strong>
                    {' '}avec le nom de votre commerce.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-medium text-ink">Accès activé sous 24h</p>
                  <p className="text-muted mt-0.5">
                    Votre compte est activé manuellement après vérification du paiement.
                  </p>
                </div>
              </li>
            </ol>

            {/* Boutons WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href={`${waBase}?text=${monthlyMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm px-4 py-3 rounded-control hover:bg-[#20b95a] transition-colors"
              >
                <MessageCircle size={16} />
                Mensuel — {fmtFCFA(monthlyFcfa)}
              </a>
              <a
                href={`${waBase}?text=${annualMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm px-4 py-3 rounded-control hover:bg-[#20b95a] transition-colors"
              >
                <MessageCircle size={16} />
                Annuel — {fmtFCFA(annualFcfa)}
              </a>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
