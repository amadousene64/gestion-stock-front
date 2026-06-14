import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { portalApi } from '../services/customersApi';
import type { PortalData } from '../types/customer';
import { formatFCFA } from '../lib/format';

const TYPE_LABELS: Record<string, string> = {
  deposit:     'Acompte versé',
  payment:     'Remboursement dette',
  credit_sale: 'Vente à crédit',
  refund:      'Remboursement',
  adjustment:  'Ajustement',
};

const STATUS_LABELS: Record<string, string> = {
  issued:    'Émise',
  cancelled: 'Annulée',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PortailClientPage() {
  const { token } = useParams<{ token: string }>();

  const [data,    setData]    = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showInvoices, setShowInvoices] = useState(false);

  useEffect(() => {
    if (!token) { setError('Lien invalide.'); setLoading(false); return; }
    portalApi.getData(token)
      .then(setData)
      .catch(() => setError('Ce lien est invalide ou a expiré.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-muted text-sm animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="text-4xl">🔒</p>
        <h1 className="font-display text-xl font-bold text-ink">Lien invalide ou expiré</h1>
        <p className="text-sm text-muted max-w-xs">
          {error || 'Ce lien n\'est plus valide. Demandez un nouveau lien à votre commerçant.'}
        </p>
      </div>
    );
  }

  const { customerName, phone, balance, ledger, invoices } = data;
  const isCredit  = balance >= 0;
  const balanceLabel = isCredit
    ? `Avoir : ${formatFCFA(balance)}`
    : `Doit : ${formatFCFA(Math.abs(balance))}`;
  const balanceBg    = isCredit ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
  const balanceColor = isCredit ? 'text-emerald-700' : 'text-red-600';

  return (
    <div className="min-h-screen bg-canvas pb-12">

      {/* En-tête minimaliste */}
      <header className="bg-surface border-b border-line px-4 py-3 text-center">
        <p className="text-xs text-muted uppercase tracking-widest">Espace client</p>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">

        {/* Identité client */}
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-ink">{customerName}</h1>
          {phone && (
            <p className="text-sm text-muted mt-1">{phone}</p>
          )}
        </div>

        {/* Solde prominent */}
        <div className={`border rounded-card px-6 py-5 text-center ${balanceBg}`}>
          <p className="text-xs text-muted uppercase tracking-wide mb-2">Solde de votre compte</p>
          <p className={`text-3xl font-bold ${balanceColor}`}>{balanceLabel}</p>
          {balance === 0 && (
            <p className="text-sm text-muted mt-1">Aucune dette, aucun avoir.</p>
          )}
        </div>

        {/* Historique des écritures */}
        <section>
          <h2 className="font-display text-lg font-bold text-ink mb-3">
            Historique des versements
          </h2>

          {ledger.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">Aucune écriture pour l'instant.</p>
          ) : (
            <div className="divide-y divide-line border border-line rounded-card overflow-hidden bg-surface">
              {ledger.map(e => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {TYPE_LABELS[e.type] ?? e.type}
                    </p>
                    <p className="text-xs text-muted">{fmtDate(e.createdAt)}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${e.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {e.amount >= 0 ? '+' : ''}{formatFCFA(e.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Factures */}
        {invoices.length > 0 && (
          <section>
            <button
              onClick={() => setShowInvoices(v => !v)}
              className="w-full flex items-center justify-between py-2 font-display text-lg font-bold text-ink"
            >
              <span>Mes factures ({invoices.length})</span>
              <span className="text-muted text-base">{showInvoices ? '▲' : '▼'}</span>
            </button>

            {showInvoices && (
              <div className="divide-y divide-line border border-line rounded-card overflow-hidden bg-surface mt-1">
                {invoices.map(inv => (
                  <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Facture {inv.number}</p>
                      <p className="text-xs text-muted">{inv.storeName} — {fmtDate(inv.createdAt)}</p>
                      <span className={`inline-block text-xs mt-0.5 px-2 py-0.5 rounded-full font-medium
                        ${inv.status === 'issued' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-ink">{formatFCFA(inv.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <p className="text-center text-xs text-muted pt-4">
          Ces informations sont en lecture seule. Contactez votre commerçant pour toute question.
        </p>
      </div>
    </div>
  );
}
