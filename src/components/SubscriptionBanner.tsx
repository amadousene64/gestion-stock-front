import { Link } from 'react-router-dom';
import { AlertTriangle, Info, MessageCircle, X } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';

const WHATSAPP_NUMBER = '221775350649'; // Orange Money / Wave / WhatsApp

export default function SubscriptionBanner() {
  const { user } = useAuth();
  const { status, daysLeft, isLoading } = useSubscription();

  if (isLoading || !user) return null;

  const isOwner = user.role === 'owner';

  if (status === 'suspended') {
    const waMsg = encodeURIComponent('Bonjour, mon compte commerçant est suspendu. Je souhaite régulariser ma situation.');
    return (
      <div className="bg-red-100 border-b-2 border-danger px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <X size={16} className="text-danger shrink-0" />
          <span className="text-sm text-red-900 font-semibold">
            Votre compte est suspendu. Les modifications sont désactivées. Contactez-nous pour régulariser.
          </span>
        </div>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold px-3 py-1.5 rounded-control hover:bg-[#1eb357] transition-colors shrink-0 whitespace-nowrap"
        >
          <MessageCircle size={13} />
          Nous contacter
        </a>
      </div>
    );
  }

  if (status === 'active') return null;

  if (status === 'trial' && (daysLeft == null || daysLeft > 7)) {
    return (
      <div className="bg-brand-50 border-b border-brand-100 px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-xs text-brand-600 font-medium">
          Essai gratuit · {daysLeft != null ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}` : 'en cours'}
        </span>
        {isOwner && (
          <Link to="/abonnement" className="text-xs font-semibold text-brand-500 hover:text-brand-600 whitespace-nowrap">
            Voir les offres →
          </Link>
        )}
      </div>
    );
  }

  if (status === 'trial' && daysLeft != null && daysLeft <= 7) {
    return (
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle size={15} className="text-orange-500 shrink-0" />
          <span className="text-sm text-orange-800 font-medium">
            Votre essai se termine dans{' '}
            {daysLeft === 0 ? 'moins de 24h' : `${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
          </span>
        </div>
        {isOwner && (
          <Link
            to="/abonnement"
            className="inline-flex items-center justify-center gap-1 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-control hover:bg-orange-600 transition-colors shrink-0"
          >
            Passer à Pro
          </Link>
        )}
      </div>
    );
  }

  if (status === 'free') {
    return (
      <div className="bg-canvas border-b border-line px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info size={13} className="text-muted shrink-0" />
          <span className="text-xs text-muted">Formule gratuite — fonctions limitées</span>
        </div>
        {isOwner && (
          <Link to="/abonnement" className="text-xs font-semibold text-brand-500 hover:text-brand-600 whitespace-nowrap">
            Passer à Pro →
          </Link>
        )}
      </div>
    );
  }

  if (status === 'grace') {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle size={15} className="text-danger shrink-0" />
          <span className="text-sm text-red-800 font-medium">
            Abonnement expiré — période de grâce en cours, renouvelez maintenant
          </span>
        </div>
        {isOwner && (
          <Link
            to="/abonnement"
            className="inline-flex items-center justify-center gap-1 bg-danger text-white text-xs font-semibold px-3 py-1.5 rounded-control hover:bg-red-700 transition-colors shrink-0"
          >
            Renouveler
          </Link>
        )}
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="bg-red-100 border-b-2 border-danger px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <X size={16} className="text-danger shrink-0" />
          <span className="text-sm text-red-900 font-semibold">
            Accès bloqué — votre abonnement est expiré. Les modifications sont désactivées.
          </span>
        </div>
        {isOwner && (
          <Link
            to="/abonnement"
            className="inline-flex items-center justify-center gap-1 bg-danger text-white text-sm font-semibold px-4 py-2 rounded-control hover:bg-red-700 transition-colors shrink-0"
          >
            Renouveler
          </Link>
        )}
      </div>
    );
  }

  return null;
}
