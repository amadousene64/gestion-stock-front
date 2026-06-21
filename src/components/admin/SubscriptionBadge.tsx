import type { SubscriptionStatus } from '../../types/admin';
import { isLifetime } from '../../types/admin';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  trial:    { label: 'Essai',    className: 'bg-brand-100 text-brand-600' },
  active:   { label: 'Actif',   className: 'bg-green-100 text-green-700' },
  lifetime: { label: 'À vie',   className: 'bg-purple-100 text-purple-700' },
  business: { label: 'Business', className: 'bg-indigo-100 text-indigo-700' },
  free:     { label: 'Gratuit', className: 'bg-gray-100 text-gray-600' },
  grace:    { label: 'Grâce',   className: 'bg-yellow-100 text-yellow-700' },
  expired:  { label: 'Expiré',  className: 'bg-red-100 text-danger' },
};

interface Props {
  status: string;
  subscription?: Pick<SubscriptionStatus, 'billingCycle' | 'expiresAt' | 'tier'>;
}

export default function SubscriptionBadge({ status, subscription }: Props) {
  const tier = subscription?.tier;
  const key  = (subscription && status === 'active' && isLifetime(subscription))
    ? 'lifetime'
    : (status === 'active' && (tier === 'business' || tier === 'paid'))
      ? 'business'
      : status;
  const cfg = STATUS_CONFIG[key] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
