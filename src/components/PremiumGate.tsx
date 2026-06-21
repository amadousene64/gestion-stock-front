import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface PremiumGateProps {
  feature: string;
  children: ReactNode;
  /** Affiche uniquement le prompt d'upgrade sans contenu flouté derrière */
  fullPage?: boolean;
}

function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center">
        <Lock size={28} className="text-brand-400" />
      </div>
      <div className="space-y-1.5">
        <p className="font-display font-bold text-ink text-lg">Fonctionnalité Pro</p>
        <p className="text-sm text-muted max-w-xs">
          Cette section est réservée à la formule Pro.
        </p>
      </div>
      <Link
        to="/abonnement"
        className="inline-flex items-center gap-2 bg-brand-500 text-white font-semibold text-sm px-5 py-3 rounded-control hover:bg-brand-600 transition-colors"
      >
        Découvrir la formule Pro →
      </Link>
    </div>
  );
}

export default function PremiumGate({ feature, children, fullPage = false }: PremiumGateProps) {
  const { hasFeature } = useSubscription();

  if (hasFeature(feature)) return <>{children}</>;
  if (fullPage) return <UpgradePrompt />;

  return (
    <div className="relative rounded-card overflow-hidden min-h-[200px]">
      <div className="opacity-20 pointer-events-none select-none blur-[2px] max-h-96 overflow-hidden">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-surface/70 backdrop-blur-[1px]">
        <div className="bg-surface border border-line rounded-card shadow-card p-6 text-center max-w-xs mx-4 space-y-3">
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
              <Lock size={20} className="text-brand-400" />
            </div>
          </div>
          <p className="font-semibold text-ink">Fonctionnalité Pro</p>
          <p className="text-xs text-muted">Disponible en formule Pro.</p>
          <Link
            to="/abonnement"
            className="inline-flex items-center justify-center w-full gap-2 bg-brand-500 text-white font-semibold text-sm px-4 py-2.5 rounded-control hover:bg-brand-600 transition-colors"
          >
            Passer à Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
