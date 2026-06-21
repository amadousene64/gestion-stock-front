import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

interface LimitAlertProps {
  label: string;
  currentTier: string;
}

function upgradeTierName(tier: string): string {
  return tier === 'free' ? 'Pro' : 'Business';
}

export default function LimitAlert({ label, currentTier }: LimitAlertProps) {
  const target  = upgradeTierName(currentTier);
  const benefit = target === 'Business' ? `des ${label} illimité(e)s` : `plus de ${label}`;

  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-card px-4 py-3">
      <TrendingUp size={15} className="text-amber-600 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">
        Limite atteinte.{' '}
        <Link to="/abonnement" className="font-semibold underline hover:no-underline">
          Passez à {target}
        </Link>
        {' '}pour {benefit}.
      </p>
    </div>
  );
}
