import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FileDown, X, Plus, Loader2, Check, ChevronRight,
  AlertCircle, RefreshCw, Trash2,
} from 'lucide-react';
import { invoicesApi } from '../services/invoicesApi';
import { proformasApi } from '../services/proformasApi';
import { productsApi } from '../services/catalogueApi';
import { customersApi } from '../services/customersApi';
import { locationsApi } from '../services/locationsApi';
import { useBoutique } from '../contexts/BoutiqueContext';
import { extractApiError } from '../lib/apiError';
import type {
  InvoiceSummary, InvoiceDetail,
  ProformaSummary, ProformaDetail, ProformaStatus,
  CreateProformaDto, UpdateProformaDto, ProformaItemDto,
  ConvertProformaResponse,
} from '../types/invoice';
import type { Product } from '../types/catalogue';
import type { Customer } from '../types/customer';
import type { Location } from '../types/location';
import type { Boutique } from '../types/boutique';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

// ── Formatters ─────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

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

// ── Status config ──────────────────────────────────────────────────────────────

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  issued:    { label: 'Émise',   cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', cls: 'bg-red-100 text-red-600' },
};

const PROFORMA_STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600' },
  sent:      { label: 'Envoyé',    cls: 'bg-blue-100 text-blue-700' },
  accepted:  { label: 'Accepté',   cls: 'bg-green-100 text-green-700' },
  converted: { label: 'Converti',  cls: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Annulé',    cls: 'bg-red-100 text-red-600' },
};

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const cfg = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Items table (shared for invoice + proforma detail) ─────────────────────────

function ItemsTable({ items }: { items: { description?: string; productName?: string; quantity: number; unitPrice: number; lineTotal: number }[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[400px]">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold text-muted uppercase tracking-wide">
            <th className="pb-2 pr-3">Description</th>
            <th className="pb-2 pr-3 text-right whitespace-nowrap">Qté</th>
            <th className="pb-2 pr-3 text-right whitespace-nowrap">Prix unit.</th>
            <th className="pb-2 text-right whitespace-nowrap">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((it, i) => (
            <tr key={i}>
              <td className="py-2 pr-3 text-ink">{it.description ?? it.productName}</td>
              <td className="py-2 pr-3 text-right text-muted">{it.quantity}</td>
              <td className="py-2 pr-3 text-right text-muted">{fmtCurrency(it.unitPrice)}</td>
              <td className="py-2 text-right font-medium text-ink">{fmtCurrency(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Invoice Detail Modal ───────────────────────────────────────────────────────

interface InvoiceDetailModalProps {
  invoiceId: string;
  onClose: () => void;
  onCancelled: (updated: InvoiceSummary) => void;
}

function InvoiceDetailModal({ invoiceId, onClose, onCancelled }: InvoiceDetailModalProps) {
  const [detail,    setDetail]    = useState<InvoiceDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [err,       setErr]       = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    invoicesApi.get(invoiceId)
      .then(setDetail)
      .catch(() => setErr('Impossible de charger la facture.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const handlePdf = async () => {
    if (!detail) return;
    setPdfLoading(true);
    try {
      const blob = await invoicesApi.getPdfBlob(invoiceId);
      downloadBlob(blob, `${detail.number}.pdf`);
    } catch { setErr('Erreur lors du téléchargement du PDF.'); }
    finally { setPdfLoading(false); }
  };

  const handleCancel = async () => {
    if (!detail) return;
    setCancelling(true);
    setErr('');
    try {
      const updated = await invoicesApi.cancel(invoiceId);
      setDetail(updated);
      onCancelled(updated);
      setShowCancelConfirm(false);
    } catch (e) { setErr(extractApiError(e)); }
    finally { setCancelling(false); }
  };

  return (
    <>
    <Modal title="Détail de la facture" onClose={onClose}>
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      )}

      {err && !loading && (
        <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
      )}

      {detail && (
        <div className="space-y-5">
          {/* En-tête */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-display text-xl font-bold text-ink">{detail.number}</p>
              <p className="text-xs text-muted mt-0.5">{fmtDate(detail.createdAt)}</p>
            </div>
            <StatusBadge status={detail.status} map={INVOICE_STATUS} />
          </div>

          {/* Méta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-0.5">Client</p>
              <p className="text-ink">{detail.customerName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-0.5">Boutique</p>
              <p className="text-ink">{detail.storeName}</p>
            </div>
          </div>

          {/* Lignes */}
          {detail.items.length > 0 && (
            <div>
              <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">Articles</p>
              <ItemsTable items={detail.items} />
            </div>
          )}

          {/* Notes */}
          {detail.notes && (
            <div>
              <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-ink bg-canvas rounded-control px-3 py-2">{detail.notes}</p>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-end border-t border-line pt-3">
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wide">Total</p>
              <p className="font-display text-2xl font-bold text-ink">{fmtCurrency(detail.total)}</p>
            </div>
          </div>

          {err && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              onClick={handlePdf}
              disabled={pdfLoading}
              className="flex-1 min-w-[140px]"
            >
              {pdfLoading
                ? <><Loader2 size={16} className="animate-spin" /> PDF…</>
                : <><FileDown size={16} /> Télécharger PDF</>
              }
            </Button>
            {detail.status === 'issued' && (
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelling}
                className="flex-1 min-w-[120px] text-danger border-danger/30 hover:bg-red-50"
              >
                <X size={16} /> Annuler
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>

    {showCancelConfirm && detail && (
      <Modal title={`Annuler la facture ${detail.number} ?`} onClose={() => setShowCancelConfirm(false)}>
        <div className="space-y-4">
          <div className="flex gap-3 bg-red-50 border border-red-200 rounded-control px-3 py-3 text-sm text-red-800">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>
              La vente associée sera annulée, le stock réajusté et toute dette client correspondante annulée. Cette action est <strong>irréversible</strong>.
            </span>
          </div>
          {err && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={() => setShowCancelConfirm(false)}
              disabled={cancelling}
              className="flex-1"
            >
              <X size={16} /> Retour
            </Button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-control bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling
                ? <><Loader2 size={16} className="animate-spin" /> Annulation…</>
                : <><Trash2 size={16} /> Confirmer l'annulation</>
              }
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}

// ── Convert Dialog ─────────────────────────────────────────────────────────────

interface ConvertDialogProps {
  proforma: ProformaDetail;
  onSuccess: (res: ConvertProformaResponse, updatedProforma: ProformaDetail) => void;
  onClose: () => void;
}

function ConvertDialog({ proforma, onSuccess, onClose }: ConvertDialogProps) {
  const [genInvoice, setGenInvoice] = useState(true);
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState('');

  const handleConvert = async () => {
    setLoading(true); setErr('');
    try {
      const res = await proformasApi.convert(proforma.id, { generateInvoice: genInvoice });
      const updated = await proformasApi.get(proforma.id);
      onSuccess(res, updated);
    } catch (e) { setErr(extractApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Convertir en vente" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-control px-3 py-3 text-sm text-amber-800 flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Cette action est irréversible. Le stock sera déduit à l'emplacement <strong>{proforma.locationName}</strong>.
          </span>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={genInvoice}
            onChange={e => setGenInvoice(e.target.checked)}
            className="w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-sm text-ink">Générer une facture en même temps</span>
        </label>

        {err && (
          <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={16} /> Annuler
          </Button>
          <Button onClick={handleConvert} disabled={loading} className="flex-1">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Conversion…</>
              : <><Check size={16} /> Confirmer</>
            }
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Proforma Detail Modal ──────────────────────────────────────────────────────

interface ProformaDetailModalProps {
  proformaId: string;
  onClose: () => void;
  onUpdated: (p: ProformaSummary) => void;
  onEditRequest: (p: ProformaDetail) => void;
}

const ALLOWED_NEXT: Record<ProformaStatus, ProformaStatus[]> = {
  draft:     ['sent', 'accepted', 'cancelled'],
  sent:      ['accepted', 'cancelled'],
  accepted:  ['cancelled'],
  converted: [],
  cancelled: [],
};

const STATUS_BTN_LABELS: Partial<Record<ProformaStatus, string>> = {
  sent:      'Marquer Envoyé',
  accepted:  'Marquer Accepté',
  cancelled: 'Annuler',
};

function ProformaDetailModal({ proformaId, onClose, onUpdated, onEditRequest }: ProformaDetailModalProps) {
  const [detail,      setDetail]      = useState<ProformaDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const [statusBusy,  setStatusBusy]  = useState<string | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [err,         setErr]         = useState('');
  const [convertMsg,  setConvertMsg]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    proformasApi.get(proformaId)
      .then(setDetail)
      .catch(() => setErr('Impossible de charger le pro-forma.'))
      .finally(() => setLoading(false));
  }, [proformaId]);

  useEffect(() => { load(); }, [load]);

  const handlePdf = async () => {
    if (!detail) return;
    setPdfLoading(true);
    try {
      const blob = await proformasApi.getPdfBlob(proformaId);
      downloadBlob(blob, `${detail.number}.pdf`);
    } catch { setErr('Erreur lors du téléchargement du PDF.'); }
    finally { setPdfLoading(false); }
  };

  const handleStatus = async (nextStatus: ProformaStatus) => {
    if (!detail) return;
    setStatusBusy(nextStatus); setErr('');
    try {
      const updated = await proformasApi.updateStatus(proformaId, { status: nextStatus });
      setDetail(updated);
      onUpdated(updated);
    } catch (e) { setErr(extractApiError(e)); }
    finally { setStatusBusy(null); }
  };

  const handleConvertSuccess = (res: ConvertProformaResponse, updatedProforma: ProformaDetail) => {
    setShowConvert(false);
    setDetail(updatedProforma);
    onUpdated(updatedProforma);
    setConvertMsg(
      `Vente créée avec succès.${res.invoiceNumber ? ` Facture ${res.invoiceNumber} générée.` : ''}`
    );
  };

  const nextStatuses = detail ? ALLOWED_NEXT[detail.status] : [];
  const canEdit = detail?.status === 'draft' || detail?.status === 'sent';
  const canConvert = detail?.status === 'accepted';

  return (
    <Modal title="Détail du pro-forma" onClose={onClose}>
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      )}

      {err && !loading && (
        <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2 mb-4">{err}</p>
      )}

      {detail && (
        <div className="space-y-5">
          {/* En-tête */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display text-xl font-bold text-ink">{detail.number}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-brand-50 text-brand-500 border border-brand-200">
                  PRO-FORMA
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">{fmtDate(detail.createdAt)}</p>
            </div>
            <StatusBadge status={detail.status} map={PROFORMA_STATUS} />
          </div>

          {convertMsg && (
            <div className="bg-green-50 border border-green-200 rounded-control px-3 py-2 text-sm text-green-700 flex gap-2">
              <Check size={15} className="shrink-0 mt-0.5" />
              {convertMsg}
            </div>
          )}

          {/* Méta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-0.5">Client</p>
              <p className="text-ink">{detail.customerName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-0.5">Boutique</p>
              <p className="text-ink">{detail.storeName}</p>
            </div>
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-0.5">Emplacement</p>
              <p className="text-ink">{detail.locationName}</p>
            </div>
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-0.5">Type</p>
              <p className="text-ink capitalize">
                {detail.kind === 'retail' ? 'Détail' : 'Gros'}
                {detail.credit && ' · Crédit'}
              </p>
            </div>
          </div>

          {/* Lignes */}
          {detail.items.length > 0 && (
            <div>
              <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">Articles</p>
              <ItemsTable items={detail.items} />
            </div>
          )}

          {/* Notes */}
          {detail.notes && (
            <div>
              <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-ink bg-canvas rounded-control px-3 py-2">{detail.notes}</p>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-end border-t border-line pt-3">
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wide">Total</p>
              <p className="font-display text-2xl font-bold text-ink">{fmtCurrency(detail.total)}</p>
            </div>
          </div>

          {err && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
          )}

          {/* Actions principales */}
          <div className="flex flex-wrap gap-3 pt-1">
            {canConvert && (
              <Button
                onClick={() => setShowConvert(true)}
                className="flex-1 min-w-[160px]"
              >
                <RefreshCw size={16} /> Convertir en vente
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={handlePdf}
              disabled={pdfLoading}
              className="flex-1 min-w-[140px]"
            >
              {pdfLoading
                ? <><Loader2 size={16} className="animate-spin" /> PDF…</>
                : <><FileDown size={16} /> Télécharger PDF</>
              }
            </Button>

            {canEdit && (
              <Button
                variant="secondary"
                onClick={() => { onEditRequest(detail); onClose(); }}
                className="flex-1 min-w-[100px]"
              >
                Modifier
              </Button>
            )}
          </div>

          {/* Transitions de statut */}
          {nextStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {nextStatuses.filter(s => s !== 'cancelled' || detail.status !== 'accepted').map(next => (
                <Button
                  key={next}
                  variant="secondary"
                  onClick={() => handleStatus(next)}
                  disabled={statusBusy !== null}
                  className={`text-sm ${next === 'cancelled' ? 'text-danger border-danger/30 hover:bg-red-50' : ''}`}
                >
                  {statusBusy === next
                    ? <Loader2 size={14} className="animate-spin" />
                    : null
                  }
                  {STATUS_BTN_LABELS[next] ?? next}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {showConvert && detail && (
        <ConvertDialog
          proforma={detail}
          onSuccess={handleConvertSuccess}
          onClose={() => setShowConvert(false)}
        />
      )}
    </Modal>
  );
}

// ── Create / Edit Proforma Modal ───────────────────────────────────────────────

interface LineItem {
  productId: string;
  quantity: string;
  unitPrice: string;
}

function emptyLine(): LineItem {
  return { productId: '', quantity: '1', unitPrice: '' };
}

interface CreateEditProformaModalProps {
  mode: 'create' | 'edit';
  boutiques: Boutique[];
  activeBoutiqueId: string | null;
  initial?: ProformaDetail;
  onSuccess: (p: ProformaDetail) => void;
  onClose: () => void;
}

function CreateEditProformaModal({
  mode, boutiques, activeBoutiqueId, initial, onSuccess, onClose,
}: CreateEditProformaModalProps) {
  /* ── State ─────────────────────────────────────────────── */
  const [storeId,   setStoreId]   = useState(initial?.storeId ?? activeBoutiqueId ?? '');
  const [locId,     setLocId]     = useState(initial?.locationId ?? '');
  const [custId,    setCustId]    = useState(initial?.customerId ?? '');
  const [kind,      setKind]      = useState<'retail' | 'wholesale'>(initial?.kind ?? 'retail');
  const [credit,    setCredit]    = useState(initial?.credit ?? false);
  const [notes,     setNotes]     = useState(initial?.notes ?? '');
  const [lines,     setLines]     = useState<LineItem[]>(
    initial?.items.length
      ? initial.items.map(it => ({
          productId: it.productId,
          quantity:  String(it.quantity),
          unitPrice: String(it.unitPrice),
        }))
      : [emptyLine()]
  );

  /* ── Data loading ────────────────────────────────────────── */
  const [products,   setProducts]   = useState<Product[]>([]);
  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [locations,  setLocations]  = useState<Location[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.list(),
      customersApi.list(),
      locationsApi.list(),
    ]).then(([prods, custs, locs]) => {
      setProducts(prods.filter(p => p.active));
      setCustomers(custs);
      setLocations(locs);
    }).finally(() => setDataLoading(false));
  }, []);

  /* ── Derived ─────────────────────────────────────────────── */
  const storeLocations = useMemo(
    () => locations.filter(l => l.storeId === storeId || l.type === 'shared_warehouse'),
    [locations, storeId]
  );

  const productMap = useMemo(
    () => new Map(products.map(p => [p.id, p])),
    [products]
  );

  const runningTotal = useMemo(() => {
    return lines.reduce((acc, l) => {
      const qty = parseFloat(l.quantity) || 0;
      const price = parseFloat(l.unitPrice) || 0;
      return acc + qty * price;
    }, 0);
  }, [lines]);

  /* ── Line helpers ─────────────────────────────────────────── */
  const updateLine = (i: number, patch: Partial<LineItem>) => {
    setLines(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      if (patch.productId) {
        const prod = productMap.get(patch.productId);
        if (prod) next[i].unitPrice = String(prod.salePrice);
      }
      return next;
    });
  };

  const addLine    = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  /* ── Submit ───────────────────────────────────────────────── */
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const validate = (): string | null => {
    if (!storeId)       return 'Veuillez sélectionner une boutique.';
    if (!locId)         return 'Veuillez sélectionner un emplacement.';
    if (lines.length === 0) return 'Ajoutez au moins un article.';
    for (const l of lines) {
      if (!l.productId)            return 'Sélectionnez un produit pour chaque ligne.';
      if (!(parseFloat(l.quantity) > 0)) return 'La quantité doit être supérieure à 0.';
      if (parseFloat(l.unitPrice) < 0)  return 'Le prix unitaire ne peut pas être négatif.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validErr = validate();
    if (validErr) { setErr(validErr); return; }

    setSaving(true); setErr('');

    const items: ProformaItemDto[] = lines.map(l => ({
      productId: l.productId,
      quantity:  parseFloat(l.quantity),
      unitPrice: parseFloat(l.unitPrice),
    }));

    try {
      let result: ProformaDetail;
      if (mode === 'create') {
        const dto: CreateProformaDto = {
          storeId,
          locationId: locId,
          customerId: custId || null,
          kind, credit,
          notes: notes.trim() || null,
          items,
        };
        result = await proformasApi.create(dto);
      } else {
        const dto: UpdateProformaDto = {
          locationId: locId,
          customerId: custId || null,
          kind, credit,
          notes: notes.trim() || null,
          items,
        };
        result = await proformasApi.update(initial!.id, dto);
      }
      onSuccess(result);
    } catch (e) { setErr(extractApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      title={mode === 'create' ? 'Nouvelle pro-forma' : 'Modifier la pro-forma'}
      onClose={onClose}
    >
      {dataLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Boutique — seulement si pas de boutique active (owner "Toutes") */}
          {!activeBoutiqueId && mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Boutique</label>
              <select
                required
                value={storeId}
                onChange={e => { setStoreId(e.target.value); setLocId(''); }}
                className="min-h-[48px] w-full rounded-control border border-line bg-surface px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Choisir une boutique…</option>
                {boutiques.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          {/* Emplacement */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Emplacement <span className="text-danger">*</span></label>
            <select
              required
              value={locId}
              onChange={e => setLocId(e.target.value)}
              disabled={!storeId}
              className="min-h-[48px] w-full rounded-control border border-line bg-surface px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
            >
              <option value="">Choisir un emplacement…</option>
              {storeLocations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}{l.type === 'shared_warehouse' ? ' (commun)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Client <span className="text-muted text-xs font-normal">(optionnel)</span></label>
            <select
              value={custId}
              onChange={e => setCustId(e.target.value)}
              className="min-h-[48px] w-full rounded-control border border-line bg-surface px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Aucun client</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Type + Crédit */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <label className="text-sm font-medium text-ink">Type de vente</label>
              <select
                value={kind}
                onChange={e => setKind(e.target.value as 'retail' | 'wholesale')}
                className="min-h-[48px] w-full rounded-control border border-line bg-surface px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="retail">Détail</option>
                <option value="wholesale">Gros</option>
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none self-end pb-1">
              <input
                type="checkbox"
                checked={credit}
                onChange={e => setCredit(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-sm text-ink">Vente à crédit</span>
            </label>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Notes <span className="text-muted text-xs font-normal">(optionnel)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Conditions, délai de livraison, remarques…"
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Articles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ink">Articles <span className="text-danger">*</span></p>
              <button type="button" onClick={addLine} className="text-xs text-brand-500 font-semibold flex items-center gap-1 hover:text-brand-600">
                <Plus size={14} /> Ajouter une ligne
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0 grid grid-cols-1 gap-1.5">
                    <select
                      required
                      value={line.productId}
                      onChange={e => updateLine(i, { productId: e.target.value })}
                      className="min-h-[40px] w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Produit…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        placeholder="Qté"
                        value={line.quantity}
                        onChange={e => updateLine(i, { quantity: e.target.value })}
                        className="min-h-[40px] w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        placeholder="Prix unit."
                        value={line.unitPrice}
                        onChange={e => updateLine(i, { unitPrice: e.target.value })}
                        className="min-h-[40px] w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    {line.productId && line.quantity && line.unitPrice && (
                      <p className="text-xs text-muted text-right pr-1">
                        = {fmtCurrency((parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0))}
                      </p>
                    )}
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="mt-1 w-8 h-8 flex items-center justify-center rounded text-muted hover:text-danger hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total courant */}
          <div className="flex justify-end border-t border-line pt-3">
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wide">Total estimé</p>
              <p className="font-display text-xl font-bold text-ink">{fmtCurrency(runningTotal)}</p>
            </div>
          </div>

          {err && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              <X size={16} /> Annuler
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
                : <><Check size={16} /> {mode === 'create' ? 'Créer' : 'Mettre à jour'}</>
              }
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Invoice row ────────────────────────────────────────────────────────────────

function InvoiceRow({ inv, onClick }: { inv: InvoiceSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface rounded-card shadow-card px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-ink text-sm">{inv.number}</span>
          <StatusBadge status={inv.status} map={INVOICE_STATUS} />
        </div>
        <p className="text-xs text-muted truncate">
          {inv.customerName ?? 'Client non renseigné'} · {inv.storeName}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-ink text-sm">{fmtCurrency(inv.total)}</p>
        <p className="text-xs text-muted">{fmtDate(inv.createdAt)}</p>
      </div>
      <ChevronRight size={16} className="text-muted shrink-0" />
    </button>
  );
}

// ── Proforma row ───────────────────────────────────────────────────────────────

function ProformaRow({ pro, onClick }: { pro: ProformaSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface rounded-card shadow-card px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-ink text-sm">{pro.number}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-500 border border-brand-200">
            PRO-FORMA
          </span>
          <StatusBadge status={pro.status} map={PROFORMA_STATUS} />
        </div>
        <p className="text-xs text-muted truncate">
          {pro.customerName ?? 'Client non renseigné'} · {pro.storeName}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-ink text-sm">{fmtCurrency(pro.total)}</p>
        <p className="text-xs text-muted">{fmtDate(pro.createdAt)}</p>
      </div>
      <ChevronRight size={16} className="text-muted shrink-0" />
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = 'invoices' | 'proformas';

const INVOICE_STATUS_FILTERS = [
  { value: '',          label: 'Tous' },
  { value: 'issued',    label: 'Émises' },
  { value: 'cancelled', label: 'Annulées' },
];

const PROFORMA_STATUS_FILTERS = [
  { value: '',          label: 'Tous' },
  { value: 'draft',     label: 'Brouillon' },
  { value: 'sent',      label: 'Envoyés' },
  { value: 'accepted',  label: 'Acceptés' },
  { value: 'converted', label: 'Convertis' },
  { value: 'cancelled', label: 'Annulés' },
];

export default function FacturesPage() {
  const { boutiques, activeBoutiqueId, isAllBoutiques } = useBoutique();

  /* ── Tabs ────────────────────────────────────────────── */
  const [tab, setTab] = useState<Tab>('invoices');

  /* ── Invoice state ───────────────────────────────────── */
  const [invoices,      setInvoices]      = useState<InvoiceSummary[]>([]);
  const [invLoading,    setInvLoading]    = useState(true);
  const [invSearch,     setInvSearch]     = useState('');
  const [invStatus,     setInvStatus]     = useState('');
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);

  /* ── Proforma state ──────────────────────────────────── */
  const [proformas,     setProformas]     = useState<ProformaSummary[]>([]);
  const [proLoading,    setProLoading]    = useState(true);
  const [proSearch,     setProSearch]     = useState('');
  const [proStatus,     setProStatus]     = useState('');
  const [selectedProId, setSelectedProId] = useState<string | null>(null);

  /* ── Proforma create/edit ────────────────────────────── */
  const [createModal,   setCreateModal]   = useState(false);
  const [editProforma,  setEditProforma]  = useState<ProformaDetail | null>(null);

  /* ── Load ────────────────────────────────────────────── */
  useEffect(() => {
    setInvLoading(true);
    invoicesApi.list()
      .then(setInvoices)
      .finally(() => setInvLoading(false));
  }, []);

  useEffect(() => {
    setProLoading(true);
    proformasApi.list()
      .then(setProformas)
      .finally(() => setProLoading(false));
  }, []);

  /* ── Filtered lists ──────────────────────────────────── */
  const filteredInvoices = useMemo(() => {
    const search = invSearch.trim().toLowerCase();
    return invoices.filter(inv => {
      if (!isAllBoutiques && activeBoutiqueId && inv.storeId !== activeBoutiqueId) return false;
      if (invStatus && inv.status !== invStatus) return false;
      if (search) {
        const hay = `${inv.number} ${inv.customerName ?? ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [invoices, isAllBoutiques, activeBoutiqueId, invStatus, invSearch]);

  const filteredProformas = useMemo(() => {
    const search = proSearch.trim().toLowerCase();
    return proformas.filter(pro => {
      if (!isAllBoutiques && activeBoutiqueId && pro.storeId !== activeBoutiqueId) return false;
      if (proStatus && pro.status !== proStatus) return false;
      if (search) {
        const hay = `${pro.number} ${pro.customerName ?? ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [proformas, isAllBoutiques, activeBoutiqueId, proStatus, proSearch]);

  /* ── Handlers ────────────────────────────────────────── */
  const handleInvoiceCancelled = (updated: InvoiceSummary) => {
    setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleProformaUpdated = (updated: ProformaSummary) => {
    setProformas(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
  };

  const handleProformaCreated = (p: ProformaDetail) => {
    setProformas(prev => [p as ProformaSummary, ...prev]);
    setCreateModal(false);
    setSelectedProId(p.id);
  };

  const handleProformaEdited = (p: ProformaDetail) => {
    setProformas(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x));
    setEditProforma(null);
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* Page header */}
      <PageHeader title={<h1 className="font-display text-xl font-bold text-ink">Factures & Pro-formas</h1>}>
        {tab === 'proformas' && (
          <Button onClick={() => setCreateModal(true)}>
            <Plus size={18} /> Nouvelle pro-forma
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 bg-canvas rounded-control p-1 w-fit">
        {([['invoices', 'Factures'], ['proformas', 'Pro-formas']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'px-4 py-2 rounded text-sm font-semibold transition-colors',
              tab === key
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── INVOICES TAB ────────────────────────────────── */}
      {tab === 'invoices' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Input
              value={invSearch}
              onChange={e => setInvSearch(e.target.value)}
              placeholder="Rechercher (numéro, client…)"
              className="flex-1 min-w-[200px]"
            />
            <select
              value={invStatus}
              onChange={e => setInvStatus(e.target.value)}
              className="min-h-[48px] rounded-control border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {INVOICE_STATUS_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* List */}
          {invLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-2xl select-none">🧾</div>
              <p className="text-sm text-muted max-w-xs">
                {invoices.length === 0
                  ? 'Aucune facture pour l\'instant. Les factures apparaîtront ici après chaque vente.'
                  : 'Aucune facture ne correspond à vos critères de recherche.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map(inv => (
                <InvoiceRow
                  key={inv.id}
                  inv={inv}
                  onClick={() => setSelectedInvId(inv.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROFORMAS TAB ────────────────────────────────── */}
      {tab === 'proformas' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Input
              value={proSearch}
              onChange={e => setProSearch(e.target.value)}
              placeholder="Rechercher (numéro, client…)"
              className="flex-1 min-w-[200px]"
            />
            <select
              value={proStatus}
              onChange={e => setProStatus(e.target.value)}
              className="min-h-[48px] rounded-control border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {PROFORMA_STATUS_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* List */}
          {proLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : filteredProformas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-2xl select-none">📋</div>
              <p className="text-sm text-muted max-w-xs">
                {proformas.length === 0
                  ? 'Aucun pro-forma pour l\'instant. Créez-en un pour préparer un devis client.'
                  : 'Aucun pro-forma ne correspond à vos critères de recherche.'
                }
              </p>
              {proformas.length === 0 && (
                <button
                  onClick={() => setCreateModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600"
                >
                  <Plus size={16} /> Créer un pro-forma
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProformas.map(pro => (
                <ProformaRow
                  key={pro.id}
                  pro={pro}
                  onClick={() => setSelectedProId(pro.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────── */}

      {selectedInvId && (
        <InvoiceDetailModal
          invoiceId={selectedInvId}
          onClose={() => setSelectedInvId(null)}
          onCancelled={handleInvoiceCancelled}
        />
      )}

      {selectedProId && (
        <ProformaDetailModal
          proformaId={selectedProId}
          onClose={() => setSelectedProId(null)}
          onUpdated={handleProformaUpdated}
          onEditRequest={(detail) => {
            setSelectedProId(null);
            setEditProforma(detail);
          }}
        />
      )}

      {createModal && (
        <CreateEditProformaModal
          mode="create"
          boutiques={boutiques}
          activeBoutiqueId={activeBoutiqueId}
          onSuccess={handleProformaCreated}
          onClose={() => setCreateModal(false)}
        />
      )}

      {editProforma && (
        <CreateEditProformaModal
          mode="edit"
          boutiques={boutiques}
          activeBoutiqueId={activeBoutiqueId}
          initial={editProforma}
          onSuccess={handleProformaEdited}
          onClose={() => setEditProforma(null)}
        />
      )}
    </div>
  );
}
