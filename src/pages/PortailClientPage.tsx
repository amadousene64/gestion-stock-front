import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { portalApi } from '../services/customersApi';
import type { PortalData, LedgerEntry } from '../types/customer';
import type { InvoiceSummary } from '../types/customer';
import type { InvoiceDetail } from '../types/invoice';
import { formatFCFA } from '../lib/format';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  deposit:     'Acompte versé',
  payment:     'Versement sur dette',
  credit_sale: 'Vente à crédit',
  refund:      'Remboursement',
  adjustment:  'Ajustement',
};

const STATUS_LABELS: Record<string, string> = {
  issued:    'Émise',
  cancelled: 'Annulée',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Invoice row with inline detail ─────────────────────────────────────────

interface InvoiceRowProps {
  inv: InvoiceSummary;
  token: string;
}

function InvoiceRow({ inv, token }: InvoiceRowProps) {
  const [open,        setOpen]        = useState(false);
  const [detail,      setDetail]      = useState<InvoiceDetail | null>(null);
  const [loadingDtl,  setLoadingDtl]  = useState(false);
  const [errDtl,      setErrDtl]      = useState('');
  const [loadingPdf,  setLoadingPdf]  = useState(false);

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (detail) return; // already loaded
    setLoadingDtl(true); setErrDtl('');
    try {
      const d = await portalApi.getInvoiceDetail(token, inv.id);
      setDetail(d);
    } catch {
      setErrDtl('Impossible de charger le détail.');
    } finally {
      setLoadingDtl(false);
    }
  };

  const downloadPdf = async () => {
    setLoadingPdf(true);
    try {
      const blob = await portalApi.getInvoicePdf(token, inv.id);
      downloadBlob(blob, `${inv.number}.pdf`);
    } catch {
      // silently ignore
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="border-b border-line last:border-0">
      {/* Summary row — always visible */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-canvas transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Facture {inv.number}</p>
          <p className="text-xs text-muted mt-0.5">{inv.storeName} · {fmtDate(inv.createdAt)}</p>
          <span className={`inline-block text-xs mt-1 px-2 py-0.5 rounded-full font-medium
            ${inv.status === 'issued' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABELS[inv.status] ?? inv.status}
          </span>
        </div>
        <p className="shrink-0 text-sm font-bold text-ink">{formatFCFA(inv.total)}</p>
        {open
          ? <ChevronUp size={16} className="shrink-0 text-muted" />
          : <ChevronDown size={16} className="shrink-0 text-muted" />
        }
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="bg-canvas px-4 pb-4 pt-1">
          {loadingDtl && (
            <p className="flex items-center gap-2 text-sm text-muted py-3">
              <Loader2 size={14} className="animate-spin" /> Chargement…
            </p>
          )}
          {errDtl && (
            <p className="text-sm text-red-500 py-2">{errDtl}</p>
          )}
          {detail && (
            <>
              {/* Items table */}
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm min-w-[320px]">
                  <thead>
                    <tr className="text-xs text-muted uppercase border-b border-line">
                      <th className="text-left py-1.5 font-medium">Produit</th>
                      <th className="text-right py-1.5 font-medium">Qté</th>
                      <th className="text-right py-1.5 font-medium">P.U.</th>
                      <th className="text-right py-1.5 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {detail.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2 text-ink">{item.description}</td>
                        <td className="py-2 text-right text-muted">{item.quantity}</td>
                        <td className="py-2 text-right text-muted">{formatFCFA(item.unitPrice)}</td>
                        <td className="py-2 text-right font-medium text-ink">{formatFCFA(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink">
                      <td colSpan={3} className="pt-2 text-sm font-semibold text-ink">Total</td>
                      <td className="pt-2 text-right text-sm font-bold text-ink">
                        {formatFCFA(detail.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {detail.notes && (
                <p className="text-xs text-muted mt-3 italic">{detail.notes}</p>
              )}

              {/* PDF download */}
              <Button
                onClick={downloadPdf}
                disabled={loadingPdf}
                className="mt-4 w-full"
              >
                {loadingPdf
                  ? <><Loader2 size={15} className="animate-spin" /> Génération…</>
                  : <><Download size={15} /> Télécharger le PDF</>
                }
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ledger entry row with optional receipt detail ───────────────────────────

interface LedgerRowProps {
  entry: LedgerEntry;
  token: string;
}

function LedgerRow({ entry, token }: LedgerRowProps) {
  const hasReceipt = !!entry.receiptNumber;
  const [open,       setOpen]       = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const downloadPdf = async () => {
    setLoadingPdf(true);
    try {
      const blob = await portalApi.getReceiptPdf(token, entry.id);
      downloadBlob(blob, `${entry.receiptNumber}.pdf`);
    } catch {
      // silently ignore
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="border-b border-line last:border-0">
      <button
        onClick={() => hasReceipt && setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
          ${hasReceipt ? 'hover:bg-canvas cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink">
            {TYPE_LABELS[entry.type] ?? entry.type}
          </p>
          <p className="text-xs text-muted mt-0.5">{fmtDate(entry.createdAt)}</p>
          {entry.referenceType && (
            <p className="text-xs text-muted italic mt-0.5">{entry.referenceType}</p>
          )}
        </div>
        <p className={`shrink-0 text-sm font-semibold
          ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {entry.amount >= 0 ? '+' : ''}{formatFCFA(entry.amount)}
        </p>
        {hasReceipt && (
          open
            ? <ChevronUp size={16} className="shrink-0 text-muted" />
            : <ChevronDown size={16} className="shrink-0 text-muted" />
        )}
      </button>

      {/* Receipt detail */}
      {open && hasReceipt && (
        <div className="bg-canvas px-4 pb-4 pt-1">
          <div className="text-sm space-y-1 mb-3">
            <div className="flex justify-between">
              <span className="text-muted">Numéro de reçu</span>
              <span className="font-medium text-ink">{entry.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Date</span>
              <span className="font-medium text-ink">{fmtDate(entry.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Montant</span>
              <span className="font-semibold text-emerald-700">+{formatFCFA(entry.amount)}</span>
            </div>
          </div>
          <Button
            onClick={downloadPdf}
            disabled={loadingPdf}
            className="w-full"
          >
            {loadingPdf
              ? <><Loader2 size={15} className="animate-spin" /> Génération…</>
              : <><Download size={15} /> Télécharger le reçu</>
            }
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function PortailClientPage() {
  const { token } = useParams<{ token: string }>();

  const [data,    setData]    = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

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
  const isPositive   = balance >= 0;
  const balanceLabel = isPositive
    ? `Avoir : ${formatFCFA(balance)}`
    : `Doit : ${formatFCFA(Math.abs(balance))}`;
  const balanceBg    = isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
  const balanceColor = isPositive ? 'text-emerald-700' : 'text-red-600';

  return (
    <div className="min-h-screen bg-canvas pb-12">

      <header className="bg-surface border-b border-line px-4 py-3 text-center">
        <p className="text-xs text-muted uppercase tracking-widest">Espace client</p>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">

        {/* Identité */}
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-ink">{customerName}</h1>
          {phone && <p className="text-sm text-muted mt-1">{phone}</p>}
        </div>

        {/* Solde */}
        <div className={`border rounded-card px-6 py-5 text-center ${balanceBg}`}>
          <p className="text-xs text-muted uppercase tracking-wide mb-2">Solde de votre compte</p>
          <p className={`text-3xl font-bold ${balanceColor}`}>{balanceLabel}</p>
          {balance === 0 && (
            <p className="text-sm text-muted mt-1">Aucune dette, aucun avoir.</p>
          )}
        </div>

        {/* Factures */}
        {invoices.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold text-ink mb-3">
              Mes factures ({invoices.length})
            </h2>
            <div className="border border-line rounded-card overflow-hidden bg-surface">
              {invoices.map(inv => (
                <InvoiceRow key={inv.id} inv={inv} token={token!} />
              ))}
            </div>
            <p className="text-xs text-muted mt-2 text-center">
              Cliquez sur une facture pour voir le détail et télécharger le PDF.
            </p>
          </section>
        )}

        {/* Historique des écritures */}
        <section>
          <h2 className="font-display text-lg font-bold text-ink mb-3">
            Historique des mouvements
          </h2>

          {ledger.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">Aucune écriture pour l'instant.</p>
          ) : (
            <>
              <div className="border border-line rounded-card overflow-hidden bg-surface">
                {ledger.map(e => (
                  <LedgerRow key={e.id} entry={e} token={token!} />
                ))}
              </div>
              <p className="text-xs text-muted mt-2 text-center">
                Les versements sont cliquables pour télécharger le reçu.
              </p>
            </>
          )}
        </section>

        <p className="text-center text-xs text-muted pt-4">
          Ces informations sont en lecture seule. Contactez votre commerçant pour toute question.
        </p>
      </div>
    </div>
  );
}
