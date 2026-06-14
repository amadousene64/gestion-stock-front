import { useEffect, useState } from 'react';
import {
  Plus, Pencil, X, Check, Loader2, Share2, Copy, Trash2, Phone,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { customersApi } from '../services/customersApi';
import type { Customer, LedgerEntry } from '../types/customer';
import { extractApiError } from '../lib/apiError';
import { formatFCFA } from '../lib/format';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

type CustomerForm = { name: string; phone: string };
const EMPTY_FORM: CustomerForm = { name: '', phone: '' };

const TYPE_LABELS: Record<string, string> = {
  deposit:     'Acompte versé',
  payment:     'Remboursement dette',
  credit_sale: 'Vente à crédit',
  refund:      'Remboursement',
  adjustment:  'Ajustement',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Panneau de détail client ─────────────────────────────────────────────────

interface DetailPanelProps {
  customer: Customer;
  onClose: () => void;
  onEdit:  () => void;
}

function DetailPanel({ customer, onClose, onEdit }: DetailPanelProps) {
  const [balance,       setBalance]       = useState<number | null>(null);
  const [ledger,        setLedger]        = useState<LedgerEntry[]>([]);
  const [loadingData,   setLoadingData]   = useState(true);
  const [showLedger,    setShowLedger]    = useState(false);

  // partage
  const [shareUrl,      setShareUrl]      = useState<string | null>(null);
  const [sharing,       setSharing]       = useState(false);
  const [revoking,      setRevoking]      = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [shareErr,      setShareErr]      = useState('');

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      customersApi.getBalance(customer.id),
      customersApi.getLedger(customer.id),
    ]).then(([bal, led]) => {
      setBalance(bal.balance);
      setLedger(led);
    }).finally(() => setLoadingData(false));
  }, [customer.id]);

  const handleShare = async () => {
    setSharing(true);
    setShareErr('');
    try {
      const { url } = await customersApi.generatePortalLink(customer.id);
      setShareUrl(url);
    } catch (e) {
      setShareErr(extractApiError(e));
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await customersApi.revokePortalLink(customer.id);
      setShareUrl(null);
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

  const balanceColor = balance === null ? '' : balance >= 0 ? 'text-emerald-600' : 'text-red-500';
  const balanceLabel = balance === null ? '—' : balance >= 0
    ? `Avoir : ${formatFCFA(balance)}`
    : `Doit : ${formatFCFA(Math.abs(balance))}`;

  return (
    <Modal title={customer.name} onClose={onClose}>
      <div className="space-y-5">

        {/* Infos de base */}
        <div className="flex items-center justify-between">
          <div>
            {customer.phone && (
              <p className="flex items-center gap-1 text-sm text-muted">
                <Phone size={14} /> {customer.phone}
              </p>
            )}
            <p className="text-xs text-muted mt-0.5">
              Client depuis le {fmtDate(customer.createdAt)}
            </p>
          </div>
          <Button variant="ghost" onClick={onEdit} className="min-h-[36px] px-3 text-sm">
            <Pencil size={15} /> Modifier
          </Button>
        </div>

        {/* Solde */}
        {loadingData ? (
          <p className="text-sm text-muted py-2">Chargement du solde…</p>
        ) : (
          <div className="bg-canvas rounded-card px-4 py-3 text-center">
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Solde du compte</p>
            <p className={`text-2xl font-bold ${balanceColor}`}>{balanceLabel}</p>
          </div>
        )}

        {/* Historique des écritures (accordéon) */}
        {!loadingData && (
          <div>
            <button
              onClick={() => setShowLedger(v => !v)}
              className="w-full flex items-center justify-between py-2 text-sm font-semibold text-ink"
            >
              Historique des écritures ({ledger.length})
              {showLedger ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showLedger && (
              <div className="divide-y divide-line border border-line rounded-card mt-1 text-sm overflow-hidden">
                {ledger.length === 0 ? (
                  <p className="px-4 py-3 text-muted text-center">Aucune écriture</p>
                ) : (
                  ledger.map(e => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">
                          {TYPE_LABELS[e.type] ?? e.type}
                        </p>
                        <p className="text-xs text-muted">{fmtDate(e.createdAt)}</p>
                      </div>
                      <p className={`shrink-0 font-semibold ${e.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {e.amount >= 0 ? '+' : ''}{formatFCFA(e.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Partage du portail */}
        <div className="border-t border-line pt-4 space-y-3">
          <p className="text-sm font-semibold text-ink">Espace client partageable</p>

          {!shareUrl ? (
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
          ) : (
            <div className="space-y-3">
              <div className="bg-canvas rounded-control px-3 py-2 text-xs text-muted break-all select-all">
                {shareUrl}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={copyLink} className="flex-1 text-sm min-h-[40px]">
                  {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier le lien</>}
                </Button>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-control font-semibold text-sm bg-[#25D366] text-white hover:bg-[#1ebe5c] transition-colors"
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
                  Régénérer le lien
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="text-sm min-h-[36px] px-3 text-red-500 hover:bg-red-50"
                >
                  {revoking
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />
                  }
                  Révoquer
                </Button>
              </div>
            </div>
          )}

          {shareErr && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{shareErr}</p>
          )}
        </div>

      </div>
    </Modal>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  type ModalState = null | 'create' | Customer;
  const [modal,   setModal]   = useState<ModalState>(null);
  const [detail,  setDetail]  = useState<Customer | null>(null);
  const [form,    setForm]    = useState<CustomerForm>(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState('');
  const [nameErr, setNameErr] = useState('');

  const load = () => {
    setLoading(true);
    customersApi.list().then(setCustomers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setApiErr(''); setNameErr('');
    setModal('create');
  };

  const openEdit = (c: Customer) => {
    setForm({ name: c.name, phone: c.phone ?? '' });
    setApiErr(''); setNameErr('');
    setModal(c);
    setDetail(null);
  };

  const closeModal = () => { setModal(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setNameErr('Le nom est requis.'); return; }
    setNameErr(''); setApiErr(''); setSaving(true);

    const dto = { name: form.name.trim(), phone: form.phone.trim() || null };
    try {
      if (modal === 'create') {
        const created = await customersApi.create(dto);
        setCustomers(prev => [created, ...prev]);
      } else {
        const updated = await customersApi.update((modal as Customer).id, dto);
        setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
        if (detail?.id === updated.id) setDetail(updated);
      }
      closeModal();
    } catch (err) {
      setApiErr(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = modal !== null && modal !== 'create';

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  );

  return (
    <div className="py-6 md:py-8 space-y-5">

      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-xl font-bold text-ink">Clients</h1>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={18} /> Ajouter
        </Button>
      </div>

      {/* Recherche */}
      <Input
        label=""
        placeholder="Rechercher un client…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Chargement…</p>
      ) : filtered.length === 0 ? (
        customers.length === 0
          ? <EmptyState
              message="Aucun client pour l'instant. Ajoutez le premier."
              actionLabel="Ajouter un client"
              onAction={openCreate}
            />
          : <p className="text-sm text-muted text-center py-6">Aucun résultat pour « {search} ».</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setDetail(c)}
              className="w-full bg-surface rounded-card shadow-card px-4 py-3 flex items-center justify-between gap-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate">{c.name}</p>
                {c.phone && (
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <Phone size={12} /> {c.phone}
                  </p>
                )}
              </div>
              <Share2 size={16} className="text-muted shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Panneau de détail */}
      {detail && (
        <DetailPanel
          customer={detail}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
        />
      )}

      {/* Modal création / édition */}
      {modal !== null && (
        <Modal
          title={isEditing ? 'Modifier le client' : 'Nouveau client'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom du client"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              error={nameErr}
              placeholder="Ex. Mamadou Diallo"
              autoFocus
            />
            <Input
              label="Téléphone (optionnel)"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Ex. 77 123 45 67"
            />

            {apiErr && (
              <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{apiErr}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                <X size={18} /> Annuler
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving
                  ? <><Loader2 size={18} className="animate-spin" /> Enregistrement…</>
                  : isEditing
                    ? <><Check size={18} /> Mettre à jour</>
                    : <><Plus size={18} /> Créer</>
                }
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
