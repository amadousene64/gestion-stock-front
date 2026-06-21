import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PackagePlus, ArrowLeftRight, ClipboardList, Sliders,
  ChevronDown, ChevronUp, AlertTriangle, Loader2, Check, X, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportApi } from '../services/exportApi';
import { useSubscription } from '../hooks/useSubscription';
import { importApi } from '../services/importApi';
import type { StockImportPreview, StockImportRow } from '../services/importApi';
import { useBoutique } from '../contexts/BoutiqueContext';
import { stockApi } from '../services/stockApi';
import type { StockPosition, StockMovement } from '../services/stockApi';
import { productsApi, unitsApi } from '../services/catalogueApi';
import { locationsApi } from '../services/locationsApi';
import type { Product, Unit } from '../types/catalogue';
import type { Location } from '../types/location';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import PageActions from '../components/ui/PageActions';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

/* ─── Constantes ──────────────────────────────────────────── */

const MOVE_LABELS: Record<string, string> = {
  purchase:     'Approvisionnement',
  import:       'Import stock initial',
  sale:         'Vente',
  transfer_in:  'Transfert entrant',
  transfer_out: 'Transfert sortant',
  adjustment:   'Ajustement',
  inventory:    'Inventaire',
};

const LOC_TYPE_LABELS: Record<string, string> = {
  store_floor:      'Rayon',
  store_warehouse:  'Entrepôt boutique',
  shared_warehouse: 'Entrepôt commun',
};

const LOW_STOCK_THRESHOLD = 5;

/* ─── Helpers ─────────────────────────────────────────────── */

function fmtQty(qty: number, allowDecimal?: boolean): string {
  if (allowDecimal) return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(qty);
  return Math.round(qty).toLocaleString('fr-FR');
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/* ─── Types internes ──────────────────────────────────────── */

interface ProductRow {
  productId: string;
  productName: string;
  unit: Unit | undefined;
  totalQty: number;
  positions: { locId: string; locName: string; locType: string; qty: number }[];
}

type ModalType = 'supply' | 'transfer' | 'adjustment' | 'inventory';

/* ─── Modale : Import stock ───────────────────────────────── */

type ImportStep = 'upload' | 'preview' | 'done';

function StockImportModal({
  storeId, onClose, onImported,
}: { storeId: string | null; onClose: () => void; onImported: () => void }) {
  const [step,      setStep]      = useState<ImportStep>('upload');
  const [file,      setFile]      = useState<File | null>(null);
  const [preview,   setPreview]   = useState<StockImportPreview | null>(null);
  const [imported,  setImported]  = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [dragging,  setDragging]  = useState(false);
  const [error,     setError]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.xlsx')) { setError('Format invalide — veuillez choisir un fichier .xlsx'); return; }
    setFile(f); setError('');
  };

  const handlePreview = async () => {
    if (!file) return;
    if (!storeId) { setError('Veuillez sélectionner une boutique active avant d\'importer du stock.'); return; }
    setLoading(true); setError('');
    try {
      setPreview(await importApi.previewStock(file, storeId));
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la lecture du fichier');
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!file || !storeId) return;
    setLoading(true); setError('');
    try {
      const r = await importApi.confirmStock(file, storeId);
      setImported(r.imported);
      setStep('done');
      onImported();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'importation");
    } finally { setLoading(false); }
  };

  const pluriel = (n: number, w: string) => `${n} ${w}${n !== 1 ? 's' : ''}`;

  const formatQty = (q: number | null) => q != null ? new Intl.NumberFormat('fr-FR').format(q) : '—';

  const handleDownloadTemplate = async () => {
    setDlLoading(true); setError('');
    try { await importApi.downloadStockTemplate(storeId); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur lors du téléchargement du modèle'); }
    finally { setDlLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
      <div className="bg-surface rounded-t-2xl sm:rounded-card shadow-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-brand-500 shrink-0" />
            <h2 className="font-display text-base font-bold text-ink">
              {step === 'upload'  && 'Importer du stock initial (Excel)'}
              {step === 'preview' && 'Prévisualisation — vérifiez avant d\'importer'}
              {step === 'done'    && 'Importation terminée'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-canvas transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {step === 'upload' && (
            <>
              {!storeId && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>Aucune boutique sélectionnée.</strong> Veuillez sélectionner une boutique active pour importer du stock.
                  </p>
                </div>
              )}

              <div className="flex items-start gap-3 bg-canvas rounded-xl border border-line p-4">
                <Download size={18} className="text-brand-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-ink">Pas encore de modèle ?</p>
                  <p className="text-xs text-muted">Colonnes : <strong>Produit (nom ou SKU) *</strong> | <strong>Emplacement *</strong> | <strong>Quantité *</strong></p>
                  <p className="text-xs text-muted">Les mouvements créés seront de type <em>Approvisionnement</em>.</p>
                  <button onClick={handleDownloadTemplate}
                    disabled={dlLoading}
                    className="inline-flex items-center gap-1.5 mt-1 text-sm font-semibold text-brand-500 hover:underline disabled:opacity-60">
                    {dlLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Télécharger le modèle (.xlsx)
                  </button>
                </div>
              </div>

              {!file ? (
                <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none ${dragging ? 'border-brand-500 bg-brand-50 scale-[1.01]' : 'border-line hover:border-brand-500 hover:bg-canvas'}`}>
                  <Upload size={36} className={`mx-auto mb-3 ${dragging ? 'text-brand-500' : 'text-muted'}`} />
                  <p className="text-sm font-semibold text-ink mb-1">{dragging ? 'Relâchez pour charger le fichier' : 'Glissez-déposez votre fichier ici'}</p>
                  <p className="text-xs text-muted">ou cliquez pour parcourir — fichiers .xlsx uniquement</p>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={24} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <p className="text-sm font-bold text-emerald-700">Fichier prêt</p>
                      </div>
                      <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
                      <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} Ko</p>
                    </div>
                  </div>
                  <Button onClick={handlePreview} disabled={loading || !storeId} className="w-full">
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Analyse en cours…</> : <><CheckCircle2 size={18} /> Analyser le fichier</>}
                  </Button>
                  <button onClick={() => { setFile(null); setError(''); if (inputRef.current) inputRef.current.value = ''; }}
                    disabled={loading} className="w-full py-1.5 text-sm font-medium text-muted hover:text-ink transition-colors disabled:opacity-40">
                    Changer de fichier
                  </button>
                </div>
              )}

              <input ref={inputRef} type="file" accept=".xlsx" onChange={e => pickFile(e.target.files?.[0] ?? null)} className="hidden" />

              {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" /><p className="text-sm text-danger">{error}</p>
              </div>}
            </>
          )}

          {step === 'preview' && preview && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{preview.validCount}</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">ligne{preview.validCount !== 1 ? 's' : ''} valide{preview.validCount !== 1 ? 's' : ''}</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${preview.errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-canvas border-line'}`}>
                  <p className={`text-2xl font-bold ${preview.errorCount > 0 ? 'text-danger' : 'text-muted'}`}>{preview.errorCount}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${preview.errorCount > 0 ? 'text-danger' : 'text-muted'}`}>ligne{preview.errorCount !== 1 ? 's' : ''} en erreur</p>
                </div>
              </div>

              {preview.validCount === 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                  <p className="text-sm font-bold text-danger">Aucune ligne importable</p>
                  <p className="text-xs text-muted mt-1">Corrigez les erreurs dans votre fichier et recommencez.</p>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="text-xs text-muted uppercase bg-canvas border-b border-line">
                      <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-medium">Produit</th>
                      <th className="px-3 py-2.5 text-left font-medium">Emplacement</th>
                      <th className="px-3 py-2.5 text-right font-medium">Qté</th>
                      <th className="px-3 py-2.5 text-left font-medium">Statut / Erreur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.rows.map((row: StockImportRow) => {
                      const isErr = row.status === 'error';
                      return (
                        <tr key={row.rowNumber} className={isErr ? 'bg-red-50/70' : 'bg-emerald-50/30'}>
                          <td className="px-3 py-2.5 text-xs text-muted">{row.rowNumber}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-ink text-xs">{row.resolvedProductName ?? row.productIdentifier}</p>
                            {row.resolvedProductName && row.resolvedProductName !== row.productIdentifier && (
                              <p className="text-xs text-muted">({row.productIdentifier})</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-muted text-xs">{row.locationName || '—'}</td>
                          <td className="px-3 py-2.5 text-right text-muted text-xs">{formatQty(row.quantity)}</td>
                          <td className="px-3 py-2.5">
                            {isErr ? (
                              <div className="space-y-1">
                                {row.errors.map((e, i) => (
                                  <p key={i} className="text-xs text-danger flex items-start gap-1">
                                    <AlertCircle size={11} className="mt-0.5 shrink-0" /> {e}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={11} /> Valide
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {preview.validCount > 0 && (
                <Button onClick={handleConfirm} disabled={loading} className="w-full">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Importation en cours…</> : <><CheckCircle2 size={18} /> Importer les {pluriel(preview.validCount, 'mouvement')} valide{preview.validCount !== 1 ? 's' : ''}</>}
                </Button>
              )}
              {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" /><p className="text-sm text-danger">{error}</p>
              </div>}
            </>
          )}

          {step === 'done' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-ink">{pluriel(imported, 'mouvement')} importé{imported !== 1 ? 's' : ''} !</p>
                <p className="text-sm text-muted mt-1">Le stock a été mis à jour.</p>
              </div>
              <Button onClick={onClose} className="px-8">Fermer</Button>
            </div>
          )}
        </div>

        {(step === 'upload' || step === 'preview') && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-line shrink-0 bg-canvas rounded-b-2xl sm:rounded-b-card">
            {step === 'preview' ? (
              <button onClick={() => { setStep('upload'); setError(''); }} disabled={loading}
                className="text-sm font-semibold text-muted hover:text-ink transition-colors disabled:opacity-40">← Changer de fichier</button>
            ) : <span />}
            <button onClick={onClose} disabled={loading}
              className="text-sm font-semibold text-muted hover:text-ink transition-colors disabled:opacity-40">Annuler</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Modale : Approvisionner ─────────────────────────────── */

function SupplyModal({
  products, units, locations, onSuccess, onClose,
}: {
  products: Product[]; units: Unit[]; locations: Location[];
  onSuccess: () => void; onClose: () => void;
}) {
  const [productId,  setProductId]  = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity,   setQuantity]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  const unit = useMemo(() => {
    const p = products.find(p => p.id === productId);
    return p ? units.find(u => u.id === p.unitId) : undefined;
  }, [productId, products, units]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !locationId || !quantity) { setErr('Tous les champs sont requis.'); return; }
    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { setErr('La quantité doit être positive.'); return; }
    setSaving(true); setErr('');
    try {
      await stockApi.supply({ productId, locationId, quantity: qty });
      onSuccess();
    } catch (e) { setErr(extractApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Approvisionner" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Produit"
          placeholder="Choisir un produit"
          value={productId}
          onChange={e => setProductId(e.target.value)}
          options={products.filter(p => p.active).map(p => ({ value: p.id, label: p.name }))}
        />
        <Select
          label="Emplacement"
          placeholder="Choisir un emplacement"
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          options={locations.map(l => ({
            value: l.id,
            label: `${l.name} (${LOC_TYPE_LABELS[l.type] ?? l.type})`,
          }))}
        />
        <Input
          label={`Quantité${unit ? ` (${unit.label})` : ''}`}
          type="number"
          step={unit?.allowDecimal ? '0.001' : '1'}
          min="0.001"
          placeholder="Ex. 10"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
        />
        {err && <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1"><X size={18}/>Annuler</Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <><Loader2 size={18} className="animate-spin"/>Enregistrement…</> : <><Check size={18}/>Valider</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Modale : Transférer ─────────────────────────────────── */

function TransferModal({
  products, units, locations, onSuccess, onClose,
}: {
  products: Product[]; units: Unit[]; locations: Location[];
  onSuccess: () => void; onClose: () => void;
}) {
  const [productId,      setProductId]      = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId,   setToLocationId]   = useState('');
  const [quantity,       setQuantity]       = useState('');
  const [saving,         setSaving]         = useState(false);
  const [err,            setErr]            = useState('');

  const unit = useMemo(() => {
    const p = products.find(p => p.id === productId);
    return p ? units.find(u => u.id === p.unitId) : undefined;
  }, [productId, products, units]);

  const locOptions = locations.map(l => ({
    value: l.id,
    label: `${l.name} (${LOC_TYPE_LABELS[l.type] ?? l.type})`,
  }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !fromLocationId || !toLocationId || !quantity) {
      setErr('Tous les champs sont requis.'); return;
    }
    if (fromLocationId === toLocationId) { setErr('Les emplacements doivent être différents.'); return; }
    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { setErr('La quantité doit être positive.'); return; }
    setSaving(true); setErr('');
    try {
      await stockApi.transfer({ productId, fromLocationId, toLocationId, quantity: qty });
      onSuccess();
    } catch (e) { setErr(extractApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Transférer du stock" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Produit"
          placeholder="Choisir un produit"
          value={productId}
          onChange={e => setProductId(e.target.value)}
          options={products.filter(p => p.active).map(p => ({ value: p.id, label: p.name }))}
        />
        <Select
          label="De (emplacement source)"
          placeholder="Choisir l'emplacement source"
          value={fromLocationId}
          onChange={e => setFromLocationId(e.target.value)}
          options={locOptions}
        />
        <Select
          label="Vers (emplacement destination)"
          placeholder="Choisir l'emplacement destination"
          value={toLocationId}
          onChange={e => setToLocationId(e.target.value)}
          options={locOptions}
        />
        <Input
          label={`Quantité${unit ? ` (${unit.label})` : ''}`}
          type="number"
          step={unit?.allowDecimal ? '0.001' : '1'}
          min="0.001"
          placeholder="Ex. 5"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
        />
        {err && <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1"><X size={18}/>Annuler</Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <><Loader2 size={18} className="animate-spin"/>En cours…</> : <><ArrowLeftRight size={18}/>Transférer</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Modale : Ajustement ─────────────────────────────────── */

function AdjustmentModal({
  products, units, locations, onSuccess, onClose,
}: {
  products: Product[]; units: Unit[]; locations: Location[];
  onSuccess: () => void; onClose: () => void;
}) {
  const [productId,  setProductId]  = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity,   setQuantity]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  const unit = useMemo(() => {
    const p = products.find(p => p.id === productId);
    return p ? units.find(u => u.id === p.unitId) : undefined;
  }, [productId, products, units]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !locationId || quantity === '') { setErr('Tous les champs sont requis.'); return; }
    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty === 0) { setErr('La quantité ne peut pas être zéro.'); return; }
    setSaving(true); setErr('');
    try {
      await stockApi.adjust({ productId, locationId, quantity: qty });
      onSuccess();
    } catch (e) { setErr(extractApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Ajustement de stock" onClose={onClose}>
      <p className="text-sm text-muted mb-4">
        Entrez une quantité positive pour ajouter du stock, négative pour en retirer.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Produit"
          placeholder="Choisir un produit"
          value={productId}
          onChange={e => setProductId(e.target.value)}
          options={products.filter(p => p.active).map(p => ({ value: p.id, label: p.name }))}
        />
        <Select
          label="Emplacement"
          placeholder="Choisir un emplacement"
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          options={locations.map(l => ({
            value: l.id,
            label: `${l.name} (${LOC_TYPE_LABELS[l.type] ?? l.type})`,
          }))}
        />
        <Input
          label={`Quantité signée${unit ? ` (${unit.label})` : ''}`}
          type="number"
          step={unit?.allowDecimal ? '0.001' : '1'}
          placeholder="Ex. -3 ou +10"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
        />
        {err && <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1"><X size={18}/>Annuler</Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <><Loader2 size={18} className="animate-spin"/>Enregistrement…</> : <><Check size={18}/>Valider</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Modale : Inventaire physique ───────────────────────── */

function InventoryModal({
  products, units, locations, positions, onSuccess, onClose,
}: {
  products: Product[]; units: Unit[]; locations: Location[];
  positions: StockPosition[];
  onSuccess: () => void; onClose: () => void;
}) {
  const [productId,  setProductId]  = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity,   setQuantity]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  const unit = useMemo(() => {
    const p = products.find(p => p.id === productId);
    return p ? units.find(u => u.id === p.unitId) : undefined;
  }, [productId, products, units]);

  const currentQty = useMemo(() => {
    if (!productId || !locationId) return null;
    return positions.find(p => p.productId === productId && p.locationId === locationId)?.quantity ?? 0;
  }, [productId, locationId, positions]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !locationId || quantity === '') { setErr('Tous les champs sont requis.'); return; }
    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty < 0) { setErr('La quantité comptée doit être positive ou nulle.'); return; }
    setSaving(true); setErr('');
    try {
      await stockApi.inventory({ productId, locationId, targetQuantity: qty });
      onSuccess();
    } catch (e) { setErr(extractApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Inventaire physique" onClose={onClose}>
      <p className="text-sm text-muted mb-4">
        Saisissez la quantité réellement comptée. Le système calculera l'écart automatiquement.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Produit"
          placeholder="Choisir un produit"
          value={productId}
          onChange={e => { setProductId(e.target.value); setLocationId(''); }}
          options={products.filter(p => p.active).map(p => ({ value: p.id, label: p.name }))}
        />
        <Select
          label="Emplacement"
          placeholder="Choisir un emplacement"
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          options={locations.map(l => ({
            value: l.id,
            label: `${l.name} (${LOC_TYPE_LABELS[l.type] ?? l.type})`,
          }))}
        />
        {currentQty !== null && (
          <p className="text-sm text-muted">
            Stock actuel : <strong className="text-ink">{fmtQty(currentQty, unit?.allowDecimal)} {unit?.label ?? ''}</strong>
          </p>
        )}
        <Input
          label={`Quantité comptée${unit ? ` (${unit.label})` : ''}`}
          type="number"
          step={unit?.allowDecimal ? '0.001' : '1'}
          min="0"
          placeholder="Ex. 42"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
        />
        {err && <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1"><X size={18}/>Annuler</Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <><Loader2 size={18} className="animate-spin"/>Enregistrement…</> : <><ClipboardList size={18}/>Valider</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Page principale ─────────────────────────────────────── */

export default function StockPage() {
  const navigate = useNavigate();
  const { hasFeature } = useSubscription();
  const { activeBoutiqueId } = useBoutique();

  /* ── Données ─────────────────────────────────────────── */
  const [positions,  setPositions]  = useState<StockPosition[]>([]);
  const [movements,  setMovements]  = useState<StockMovement[]>([]);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [locations,  setLocations]  = useState<Location[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);

  /* ── UI ──────────────────────────────────────────────── */
  const [tab,       setTab]      = useState<'stock' | 'mouvements'>('stock');
  const [modal,     setModal]    = useState<ModalType | null>(null);
  const [search,    setSearch]   = useState('');
  const [movProd,   setMovProd]  = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [movLoaded, setMovLoaded] = useState(false);

  /* ── Chargement ────────────────────────────────────────── */
  const loadStock = () => {
    setLoadingRef(true);
    setMovLoaded(false);
    setMovements([]);
    Promise.all([
      stockApi.getPositions(activeBoutiqueId),
      productsApi.list(),
      unitsApi.list(),
      locationsApi.list(),
    ]).then(([pos, prods, us, locs]) => {
      setPositions(pos); setProducts(prods); setUnits(us); setLocations(locs);
    }).finally(() => setLoadingRef(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingRef(true);
    setMovLoaded(false);
    setMovements([]);
    Promise.all([
      stockApi.getPositions(activeBoutiqueId),
      productsApi.list(),
      unitsApi.list(),
      locationsApi.list(),
    ]).then(([pos, prods, us, locs]) => {
      if (!cancelled) {
        setPositions(pos);
        setProducts(prods);
        setUnits(us);
        setLocations(locs);
      }
    }).finally(() => { if (!cancelled) setLoadingRef(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoutiqueId]);

  const loadMovements = () => {
    setLoadingMov(true);
    stockApi.getMovements(activeBoutiqueId)
      .then(setMovements)
      .finally(() => { setLoadingMov(false); setMovLoaded(true); });
  };

  /* Charge les mouvements au premier clic sur l'onglet */
  const handleTabChange = (t: typeof tab) => {
    setTab(t);
    if (t === 'mouvements' && !movLoaded) loadMovements();
  };

  /* Recharge après une mutation */
  const onSuccess = () => {
    setModal(null);
    stockApi.getPositions(activeBoutiqueId).then(setPositions);
    if (movLoaded) stockApi.getMovements(activeBoutiqueId).then(setMovements);
  };

  /* ── Filtrage par boutique active ─────────────────────── */
  const visibleLocIds = useMemo(() => {
    if (!activeBoutiqueId) return new Set(locations.map(l => l.id));
    return new Set(
      locations
        .filter(l => l.storeId === activeBoutiqueId || l.storeId === null)
        .map(l => l.id)
    );
  }, [locations, activeBoutiqueId]);

  /* ── Construction des lignes produit ──────────────────── */
  const unitById    = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);
  const unitByProd  = useMemo(() => new Map(products.map(p => [p.id, p.unitId])), [products]);
  const locById     = useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);

  const productRows = useMemo(() => {
    const map = new Map<string, ProductRow>();

    for (const pos of positions) {
      if (!visibleLocIds.has(pos.locationId)) continue;

      if (!map.has(pos.productId)) {
        const unitId = unitByProd.get(pos.productId);
        map.set(pos.productId, {
          productId:   pos.productId,
          productName: pos.productName,
          unit:        unitId ? unitById.get(unitId) : undefined,
          totalQty:    0,
          positions:   [],
        });
      }

      const row = map.get(pos.productId)!;
      row.totalQty += pos.quantity;
      row.positions.push({
        locId:   pos.locationId,
        locName: pos.locationName,
        locType: locById.get(pos.locationId)?.type ?? '',
        qty:     pos.quantity,
      });
    }

    return Array.from(map.values())
      .filter(r => r.productName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        // Ruptures et alertes en haut
        const scoreA = a.totalQty <= 0 ? 0 : a.totalQty <= LOW_STOCK_THRESHOLD ? 1 : 2;
        const scoreB = b.totalQty <= 0 ? 0 : b.totalQty <= LOW_STOCK_THRESHOLD ? 1 : 2;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.productName.localeCompare(b.productName);
      });
  }, [positions, visibleLocIds, unitById, unitByProd, locById, search]);

  /* ── Mouvements filtrés ───────────────────────────────── */
  const filteredMovements = useMemo(() =>
    movements
      .filter(m => visibleLocIds.has(m.locationId))
      .filter(m => !movProd || m.productId === movProd),
  [movements, visibleLocIds, movProd]);

  /* ── Stats récap ──────────────────────────────────────── */
  const alertCount = productRows.filter(r => r.totalQty <= LOW_STOCK_THRESHOLD).length;

  /* ── Rendu ────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* En-tête + actions */}
      <PageHeader title={<h1 className="font-display text-xl font-bold text-ink">Stock</h1>}>
        <PageActions
          primary={
            <Button onClick={() => setModal('supply')} className="min-h-[48px] px-3 text-sm">
              <PackagePlus size={16} /> Approvisionner
            </Button>
          }
          secondary={[
            { label: 'Transférer',  icon: <ArrowLeftRight size={16} />, onClick: () => setModal('transfer') },
            { label: 'Ajustement',  icon: <Sliders size={16} />,        onClick: () => setModal('adjustment') },
            { label: 'Inventaire',  icon: <ClipboardList size={16} />,  onClick: () => setModal('inventory') },
            { label: 'Importer',    icon: <Upload size={14} />,          onClick: () => setImporting(true) },
            {
              label: hasFeature('EXPORT') ? 'Exporter' : 'Exporter (Pro)',
              icon: hasFeature('EXPORT') ? <Download size={14} /> : <Lock size={14} />,
              loading: exporting,
              onClick: hasFeature('EXPORT')
                ? () => { setExporting(true); exportApi.stock(activeBoutiqueId).finally(() => setExporting(false)); }
                : () => navigate('/abonnement'),
            },
          ]}
        />
      </PageHeader>

      {/* Alerte stock bas */}
      {!loadingRef && alertCount > 0 && (
        <div className="flex items-center gap-3 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{alertCount} produit{alertCount > 1 ? 's' : ''}</strong> en alerte de stock (≤ {LOW_STOCK_THRESHOLD}).
          </p>
        </div>
      )}

      {/* Onglets */}
      <div className="flex border-b border-line">
        {(['stock', 'mouvements'] as const).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={[
              'px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-muted hover:text-ink',
            ].join(' ')}
          >
            {t === 'stock' ? 'Stock' : 'Mouvements'}
          </button>
        ))}
      </div>

      {/* ─── Onglet Stock ─────────────────────────────────── */}
      {tab === 'stock' && (
        <>
          <Input
            label=""
            placeholder="Rechercher un produit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {loadingRef ? (
            <div className="py-12 flex justify-center">
              <Loader2 size={28} className="animate-spin text-brand-500" />
            </div>
          ) : productRows.length === 0 ? (
            search
              ? <p className="text-sm text-muted text-center py-8">Aucun résultat pour « {search} ».</p>
              : <EmptyState
                  message="Aucun stock enregistré. Commencez par approvisionner un produit."
                  actionLabel="Approvisionner"
                  onAction={() => setModal('supply')}
                />
          ) : (
            <div className="space-y-2">
              {productRows.map(row => {
                const isExpanded = expanded === row.productId;
                const isDanger  = row.totalQty <= 0;
                const isWarning = !isDanger && row.totalQty <= LOW_STOCK_THRESHOLD;

                return (
                  <div
                    key={row.productId}
                    className="bg-surface rounded-card shadow-card overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(isExpanded ? null : row.productId)}
                      className="w-full flex items-center justify-between px-4 py-3.5 gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-ink truncate">{row.productName}</p>
                          {isDanger && (
                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                              Rupture
                            </span>
                          )}
                          {isWarning && (
                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              Stock bas
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {row.positions.length} emplacement{row.positions.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={[
                          'text-lg font-bold',
                          isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-ink',
                        ].join(' ')}>
                          {fmtQty(row.totalQty, row.unit?.allowDecimal)}
                          {row.unit && <span className="text-sm font-normal text-muted ml-1">{row.unit.code}</span>}
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-line divide-y divide-line">
                        {row.positions.map(pos => (
                          <div key={pos.locId} className="flex items-center justify-between px-5 py-2.5 gap-3 bg-canvas">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink truncate">{pos.locName}</p>
                              <p className="text-xs text-muted">{LOC_TYPE_LABELS[pos.locType] ?? pos.locType}</p>
                            </div>
                            <span className={[
                              'text-sm font-semibold shrink-0',
                              pos.qty <= 0 ? 'text-red-600' : 'text-ink',
                            ].join(' ')}>
                              {fmtQty(pos.qty, row.unit?.allowDecimal)} {row.unit?.code ?? ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Onglet Mouvements ────────────────────────────── */}
      {tab === 'mouvements' && (
        <>
          <Select
            label=""
            placeholder="Tous les produits"
            value={movProd}
            onChange={e => setMovProd(e.target.value)}
            options={products.map(p => ({ value: p.id, label: p.name }))}
          />

          {loadingMov ? (
            <div className="py-12 flex justify-center">
              <Loader2 size={28} className="animate-spin text-brand-500" />
            </div>
          ) : filteredMovements.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              {movLoaded ? 'Aucun mouvement de stock pour l\'instant.' : 'Chargement des mouvements…'}
            </p>
          ) : (
            <div className="bg-surface rounded-card shadow-card divide-y divide-line overflow-hidden">
              {filteredMovements.map(mv => {
                const isPositive = mv.quantity > 0;
                return (
                  <div key={mv.id} className="flex items-start justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{mv.productName}</p>
                      <p className="text-xs text-muted truncate">
                        {MOVE_LABELS[mv.type] ?? mv.type} · {mv.locationName}
                      </p>
                      <p className="text-xs text-muted">{fmtDate(mv.createdAt)}</p>
                    </div>
                    <span className={[
                      'shrink-0 text-sm font-bold',
                      isPositive ? 'text-emerald-600' : 'text-red-500',
                    ].join(' ')}>
                      {isPositive ? '+' : ''}{mv.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Modales ──────────────────────────────────────── */}
      {modal === 'supply' && (
        <SupplyModal
          products={products} units={units} locations={locations}
          onSuccess={onSuccess} onClose={() => setModal(null)}
        />
      )}
      {modal === 'transfer' && (
        <TransferModal
          products={products} units={units} locations={locations}
          onSuccess={onSuccess} onClose={() => setModal(null)}
        />
      )}
      {modal === 'adjustment' && (
        <AdjustmentModal
          products={products} units={units} locations={locations}
          onSuccess={onSuccess} onClose={() => setModal(null)}
        />
      )}
      {modal === 'inventory' && (
        <InventoryModal
          products={products} units={units} locations={locations}
          positions={positions}
          onSuccess={onSuccess} onClose={() => setModal(null)}
        />
      )}

      {importing && (
        <StockImportModal
          storeId={activeBoutiqueId}
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); loadStock(); }}
        />
      )}

    </div>
  );
}
