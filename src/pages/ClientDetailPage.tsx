import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Pencil, X, Check, Loader2,
  Share2, Copy, Trash2, FileText, Receipt,
} from 'lucide-react';
import { customersApi } from '../services/customersApi';
import { invoicesApi } from '../services/invoicesApi';
import type { CustomerDetail, LedgerEntry } from '../types/customer';
import { extractApiError } from '../lib/apiError';
import { formatFCFA } from '../lib/format';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TYPE_LABELS: Record<string, string> = {
  deposit:     'Acompte versé',
  payment:     'Versement sur dette',
  credit_sale: 'Vente à crédit',
  refund:      'Remboursement',
  adjustment:  'Ajustement',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Modal versement / acompte ────────────────────────────────────────────────

type EntryKind = 'payment' | 'deposit';

interface EntryModalProps {
  customerId: string;
  kind: EntryKind;
  onClose: () => void;
  onSuccess: (entry: LedgerEntry) => void;
}

function EntryModal({ customerId, kind, onClose, onSuccess }: EntryModalProps) {
  const [amount,        setAmount]        = useState('');
  const [note,          setNote]          = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'orange_money' | 'wave'>('cash');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const title = kind === 'payment' ? 'Enregistrer un versement' : 'Enregistrer un acompte';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
    if (!n || n <= 0) { setErr('Montant invalide, entrez un nombre positif.'); return; }
    setErr(''); setSaving(true);
    try {
      const fn = kind === 'payment' ? customersApi.payment : customersApi.deposit;
      const entry = await fn(customerId, {
        amount: n,
        paymentMethod,
        referenceType: note.trim() || null,
      });
      onSuccess(entry);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Montant (FCFA)"
          required
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Ex. 5000"
          autoFocus
          inputMode="numeric"
        />

        <div>
          <label className="block text-xs text-muted mb-1">Mode de paiement</label>
          <div className="flex gap-2">
            {(['cash', 'orange_money', 'wave'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 h-10 rounded-control text-xs font-semibold border transition-colors ${
                  paymentMethod === m
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'border-line text-muted hover:bg-canvas'
                }`}
              >
                {m === 'cash' ? 'Espèces' : m === 'orange_money' ? 'Orange Money' : 'Wave'}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Note (optionnel)"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ex. Versement partiel"
        />

        {err && (
          <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={18} /> Annuler
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> Enregistrement…</>
              : <><Check size={18} /> Confirmer</>
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Modal d'édition du client ────────────────────────────────────────────────

interface EditModalProps {
  customer: CustomerDetail;
  onClose: () => void;
  onSuccess: (updated: CustomerDetail) => void;
}

function EditModal({ customer, onClose, onSuccess }: EditModalProps) {
  const [name,   setName]   = useState(customer.name);
  const [phone,  setPhone]  = useState(customer.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const [nameErr,setNameErr]= useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameErr('Le nom est requis.'); return; }
    setNameErr(''); setErr(''); setSaving(true);
    try {
      const updated = await customersApi.update(customer.id, {
        name: name.trim(),
        phone: phone.trim() || null,
      });
      // Merge with existing detail fields (balance, hasPortalLink don't change from edit)
      onSuccess({ ...updated, balance: customer.balance, hasPortalLink: customer.hasPortalLink });
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Modifier le client" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nom du client"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          error={nameErr}
          autoFocus
        />
        <Input
          label="Téléphone (optionnel)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Ex. 77 123 45 67"
        />
        {err && (
          <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={18} /> Annuler
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <><Loader2 size={18} className="animate-spin" /> Enregistrement…</> : <><Check size={18} /> Mettre à jour</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer,    setCustomer]    = useState<CustomerDetail | null>(null);
  const [ledger,      setLedger]      = useState<LedgerEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // modals
  const [entryKind,   setEntryKind]   = useState<EntryKind | null>(null);
  const [showEdit,    setShowEdit]    = useState(false);

  // receipt download state
  const [downloading, setDownloading] = useState<string | null>(null); // entryId

  // after a payment/deposit: propose receipt download
  const [receiptReady, setReceiptReady] = useState<LedgerEntry | null>(null);

  // portal
  const [shareUrl,    setShareUrl]    = useState<string | null>(null);
  const [sharing,     setSharing]     = useState(false);
  const [revoking,    setRevoking]    = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [shareErr,    setShareErr]    = useState('');

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      customersApi.getDetail(id),
      customersApi.getLedger(id),
    ])
      .then(([cust, led]) => {
        setCustomer(cust);
        setLedger(led);
      })
      .catch(() => setError('Impossible de charger la fiche client.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleEntrySuccess = (entry: LedgerEntry) => {
    setEntryKind(null);
    setLedger(prev => [entry, ...prev]);
    if (id) customersApi.getDetail(id).then(setCustomer).catch(() => {});
    if (entry.receiptNumber) setReceiptReady(entry);
  };

  const handleDownloadReceipt = async (entry: LedgerEntry) => {
    if (!entry.receiptNumber || !id) return;
    setDownloading(entry.id);
    try {
      const blob = await customersApi.getReceiptPdf(id, entry.id);
      downloadBlob(blob, `${entry.receiptNumber}.pdf`);
    } catch {
      // silently ignore
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadInvoice = async (entry: LedgerEntry) => {
    if (!entry.referenceId) return;
    setDownloading(entry.id);
    try {
      const invoice = await invoicesApi.getBySaleId(entry.referenceId);
      const blob = await invoicesApi.getPdfBlob(invoice.id);
      downloadBlob(blob, `${invoice.number}.pdf`);
    } catch {
      // silently ignore — invoice may not exist for old sales
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async () => {
    if (!id) return;
    setSharing(true); setShareErr('');
    try {
      const { url } = await customersApi.generatePortalLink(id);
      setShareUrl(url);
      if (customer) setCustomer({ ...customer, hasPortalLink: true });
    } catch (e) {
      setShareErr(extractApiError(e));
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async () => {
    if (!id) return;
    setRevoking(true);
    try {
      await customersApi.revokePortalLink(id);
      setShareUrl(null);
      if (customer) setCustomer({ ...customer, hasPortalLink: false });
    } catch (e) {
      setShareErr(extractApiError(e));
    } finally {
      setRevoking(false);
    }
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const whatsappLink = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent('Consultez votre compte ici : ' + shareUrl)}`
    : '';

  if (loading) {
    return (
      <div>
        <button onClick={() => navigate('/clients')} className="flex items-center gap-1.5 text-sm text-muted mb-6 hover:text-ink">
          <ArrowLeft size={16} /> Clients
        </button>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-surface rounded-card w-1/3" />
          <div className="h-28 bg-surface rounded-card" />
          <div className="h-48 bg-surface rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div>
        <button onClick={() => navigate('/clients')} className="flex items-center gap-1.5 text-sm text-muted mb-6 hover:text-ink">
          <ArrowLeft size={16} /> Clients
        </button>
        <p className="text-sm text-danger text-center py-8">{error ?? 'Client introuvable.'}</p>
      </div>
    );
  }

  const isPositive = customer.balance >= 0;
  const balanceColor = isPositive ? 'text-emerald-600' : 'text-red-500';
  const balanceBg    = isPositive ? 'bg-emerald-50'    : 'bg-red-50';
  const balanceLabel = isPositive
    ? `Avoir : ${formatFCFA(customer.balance)}`
    : `Doit : ${formatFCFA(Math.abs(customer.balance))}`;

  return (
    <div className="space-y-6">

      {/* Retour + Header */}
      <div>
        <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted mb-4 hover:text-ink">
          <ArrowLeft size={16} /> Clients
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{customer.name}</h1>
            {customer.phone && (
              <p className="flex items-center gap-1.5 text-sm text-muted mt-1">
                <Phone size={14} /> {customer.phone}
              </p>
            )}
            <p className="text-xs text-muted mt-0.5">Client depuis le {fmtDate(customer.createdAt)}</p>
          </div>
          <Button variant="ghost" onClick={() => setShowEdit(true)} className="shrink-0 min-h-[36px] px-3 text-sm">
            <Pencil size={15} /> Modifier
          </Button>
        </div>
      </div>

      {/* Solde */}
      <div className={`${balanceBg} rounded-card px-5 py-4 text-center`}>
        <p className="text-xs text-muted uppercase tracking-wide mb-1">Solde du compte</p>
        <p className={`text-3xl font-bold ${balanceColor}`}>{balanceLabel}</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => setEntryKind('payment')} variant="secondary">
          <Receipt size={18} /> Versement
        </Button>
        <Button onClick={() => setEntryKind('deposit')} variant="secondary">
          <Receipt size={18} /> Acompte
        </Button>
      </div>

      {/* Bandeau reçu disponible après versement / acompte */}
      {receiptReady && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-card px-4 py-3">
          <Receipt size={18} className="text-emerald-600 shrink-0" />
          <p className="flex-1 text-sm text-emerald-800">
            Reçu <strong>{receiptReady.receiptNumber}</strong> généré.
          </p>
          <button
            onClick={() => handleDownloadReceipt(receiptReady)}
            disabled={downloading === receiptReady.id}
            className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline disabled:opacity-50"
          >
            {downloading === receiptReady.id ? <Loader2 size={14} className="animate-spin inline" /> : 'Télécharger'}
          </button>
          <button
            onClick={() => setReceiptReady(null)}
            className="shrink-0 p-1 text-muted hover:text-ink"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Historique */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
          Historique ({ledger.length})
        </p>

        {ledger.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card px-4 py-8 text-center text-sm text-muted">
            Aucune écriture pour ce client.
          </div>
        ) : (
          <div className="bg-surface rounded-card shadow-card divide-y divide-line">
            {ledger.map(e => {
              const hasReceipt = !!e.receiptNumber;
              const hasSaleInvoice = e.type === 'credit_sale' && !!e.referenceId;
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {TYPE_LABELS[e.type] ?? e.type}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{fmtDateTime(e.createdAt)}</p>
                    {e.referenceType && (
                      <p className="text-xs text-muted italic mt-0.5">{e.referenceType}</p>
                    )}
                  </div>
                  <p className={`shrink-0 font-semibold text-sm ${e.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {e.amount >= 0 ? '+' : ''}{formatFCFA(e.amount)}
                  </p>
                  {hasReceipt && (
                    <button
                      onClick={() => handleDownloadReceipt(e)}
                      disabled={downloading === e.id}
                      title="Télécharger le reçu"
                      className="shrink-0 p-1.5 text-muted hover:text-brand-500 disabled:opacity-50 transition-colors"
                    >
                      {downloading === e.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Receipt size={15} />
                      }
                    </button>
                  )}
                  {hasSaleInvoice && (
                    <button
                      onClick={() => handleDownloadInvoice(e)}
                      disabled={downloading === e.id}
                      title="Télécharger la facture"
                      className="shrink-0 p-1.5 text-muted hover:text-brand-500 disabled:opacity-50 transition-colors"
                    >
                      {downloading === e.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : <FileText size={15} />
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Espace client partageable */}
      <div className="bg-surface rounded-card shadow-card p-5 space-y-3">
        <p className="text-sm font-semibold text-ink">Espace client partageable</p>

        {!shareUrl && !customer.hasPortalLink ? (
          <>
            <p className="text-sm text-muted">
              Générez un lien unique pour que ce client consulte son solde et ses factures.
            </p>
            <Button onClick={handleShare} disabled={sharing} className="w-full">
              {sharing
                ? <><Loader2 size={18} className="animate-spin" /> Génération…</>
                : <><Share2 size={18} /> Partager l'espace client</>
              }
            </Button>
          </>
        ) : !shareUrl ? (
          // Has a portal link but URL not shown yet
          <div className="space-y-2">
            <p className="text-sm text-muted">Un lien actif existe pour ce client.</p>
            <div className="flex gap-2">
              <Button onClick={handleShare} disabled={sharing} className="flex-1 text-sm min-h-[40px]">
                {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                Régénérer le lien
              </Button>
              <Button
                variant="ghost"
                onClick={handleRevoke}
                disabled={revoking}
                className="text-sm min-h-[40px] px-3 text-red-500 hover:bg-red-50"
              >
                {revoking ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Révoquer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-canvas rounded-control px-3 py-2 text-xs text-muted break-all select-all">
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyLink} className="flex-1 text-sm min-h-[40px]">
                {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier le lien</>}
              </Button>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-control font-medium text-sm border border-line text-muted hover:text-ink hover:border-ink transition-colors"
              >
                WhatsApp
              </a>
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleShare}
                disabled={sharing}
                className="text-sm min-h-[36px] px-3 text-muted"
              >
                {sharing ? <Loader2 size={14} className="animate-spin" /> : null}
                Régénérer
              </Button>
              <Button
                variant="ghost"
                onClick={handleRevoke}
                disabled={revoking}
                className="text-sm min-h-[36px] px-3 text-red-500 hover:bg-red-50"
              >
                {revoking ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Révoquer
              </Button>
            </div>
          </div>
        )}

        {shareErr && (
          <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{shareErr}</p>
        )}
      </div>

      {/* Modals */}
      {entryKind && (
        <EntryModal
          customerId={customer.id}
          kind={entryKind}
          onClose={() => setEntryKind(null)}
          onSuccess={handleEntrySuccess}
        />
      )}

      {showEdit && (
        <EditModal
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSuccess={updated => { setCustomer(updated); setShowEdit(false); }}
        />
      )}

    </div>
  );
}
