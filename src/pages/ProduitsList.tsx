import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Check, X, Loader2, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { exportApi } from '../services/exportApi';
import { importApi } from '../services/importApi';
import type { ImportPreviewResponse, ImportRowPreview, ImportResult } from '../services/importApi';
import { productsApi, categoriesApi, unitsApi } from '../services/catalogueApi';
import type { Product, ProductDto, Category, Unit } from '../types/catalogue';
import { formatFCFA } from '../lib/format';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import PageActions from '../components/ui/PageActions';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

// ─── Import Modal ─────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'preview' | 'done';

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step,      setStep]      = useState<ImportStep>('upload');
  const [file,      setFile]      = useState<File | null>(null);
  const [preview,   setPreview]   = useState<ImportPreviewResponse | null>(null);
  const [result,    setResult]    = useState<ImportResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [dragging,  setDragging]  = useState(false);
  const [error,     setError]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.xlsx')) {
      setError('Format invalide — veuillez choisir un fichier .xlsx');
      return;
    }
    setFile(f);
    setError('');
  };

  const downloadTemplate = async () => {
    setDlLoading(true);
    try { await importApi.downloadTemplate(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setDlLoading(false); }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const data = await importApi.preview(file);
      setPreview(data);
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la lecture du fichier');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const r = await importApi.confirm(file);
      setResult(r);
      setStep('done');
      onImported();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'importation");
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const pluriel = (n: number, word: string) =>
    `${n} ${word}${n !== 1 ? 's' : ''}`;

  const stepTitle = {
    upload:  'Importer des produits (Excel)',
    preview: 'Prévisualisation — vérifiez avant d\'importer',
    done:    'Importation terminée',
  }[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
      <div className="bg-surface rounded-t-2xl sm:rounded-card shadow-2xl w-full sm:max-w-3xl max-h-[95vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-brand-500 shrink-0" />
            <h2 className="font-display text-base font-bold text-ink leading-tight">{stepTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-canvas transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* ══ ÉTAPE 1 : UPLOAD ══ */}
          {step === 'upload' && (
            <>
              {/* Bloc modèle */}
              <div className="flex items-start gap-3 bg-canvas rounded-xl border border-line p-4">
                <Download size={18} className="text-brand-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-ink">Pas encore de modèle ?</p>
                  <p className="text-xs text-muted">
                    Téléchargez le fichier modèle, remplissez-le, puis importez-le ici.
                    Les colonnes <strong>Nom</strong>, <strong>Unité</strong> et <strong>Prix</strong> sont obligatoires.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    disabled={dlLoading}
                    className="inline-flex items-center gap-1.5 mt-1 text-sm font-semibold text-brand-500 hover:underline disabled:opacity-60"
                  >
                    {dlLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Télécharger le modèle (.xlsx)
                  </button>
                </div>
              </div>

              {/* Zone de dépôt */}
              {!file ? (
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none ${
                    dragging
                      ? 'border-brand-500 bg-brand-50 scale-[1.01]'
                      : 'border-line hover:border-brand-500 hover:bg-canvas'
                  }`}
                >
                  <Upload size={36} className={`mx-auto mb-3 ${dragging ? 'text-brand-500' : 'text-muted'}`} />
                  <p className="text-sm font-semibold text-ink mb-1">
                    {dragging ? 'Relâchez pour charger le fichier' : 'Glissez-déposez votre fichier ici'}
                  </p>
                  <p className="text-xs text-muted">ou cliquez pour parcourir — fichiers .xlsx uniquement</p>
                </div>
              ) : (
                /* Fichier sélectionné — retour visuel immédiat */
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

                  {/* Action principale — composant Button (bg-brand-500, min-h-[48px]) */}
                  <Button
                    onClick={handlePreview}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> Analyse en cours…</>
                    ) : (
                      <><CheckCircle2 size={18} /> Analyser le fichier</>
                    )}
                  </Button>

                  {/* Action secondaire — texte discret */}
                  <button
                    onClick={() => { setFile(null); setError(''); if (inputRef.current) inputRef.current.value = ''; }}
                    disabled={loading}
                    className="w-full py-1.5 text-sm font-medium text-muted hover:text-ink transition-colors disabled:opacity-40"
                  >
                    Changer de fichier
                  </button>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={e => { pickFile(e.target.files?.[0] ?? null); }}
                className="hidden"
              />

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
            </>
          )}

          {/* ══ ÉTAPE 2 : PRÉVISUALISATION ══ */}
          {step === 'preview' && preview && (
            <>
              {/* Compteurs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{preview.validCount}</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                    ligne{preview.validCount !== 1 ? 's' : ''} valide{preview.validCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${
                  preview.errorCount > 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-canvas border-line'
                }`}>
                  <p className={`text-2xl font-bold ${preview.errorCount > 0 ? 'text-danger' : 'text-muted'}`}>
                    {preview.errorCount}
                  </p>
                  <p className={`text-xs font-semibold mt-0.5 ${preview.errorCount > 0 ? 'text-danger' : 'text-muted'}`}>
                    ligne{preview.errorCount !== 1 ? 's' : ''} en erreur
                  </p>
                </div>
              </div>

              {preview.errorCount > 0 && (
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-amber-500 shrink-0" />
                  Les lignes en erreur seront ignorées. Seules les lignes valides seront importées.
                </p>
              )}

              {preview.validCount === 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center space-y-1">
                  <p className="text-sm font-bold text-danger">Aucune ligne importable</p>
                  <p className="text-xs text-muted">Corrigez les erreurs dans votre fichier et recommencez.</p>
                </div>
              )}

              {/* Tableau */}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm min-w-[580px]">
                  <thead>
                    <tr className="text-xs text-muted uppercase bg-canvas border-b border-line">
                      <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-medium">Nom</th>
                      <th className="px-3 py-2.5 text-left font-medium">Catégorie</th>
                      <th className="px-3 py-2.5 text-left font-medium">Unité</th>
                      <th className="px-3 py-2.5 text-right font-medium">Prix</th>
                      <th className="px-3 py-2.5 text-left font-medium">Statut / Erreur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.rows.map((row: ImportRowPreview) => {
                      const isErr = row.status === 'error';
                      return (
                        <tr key={row.rowNumber} className={isErr ? 'bg-red-50/70' : 'bg-emerald-50/30'}>
                          <td className="px-3 py-2.5 text-xs text-muted">{row.rowNumber}</td>
                          <td className="px-3 py-2.5 font-medium text-ink max-w-[140px] truncate">{row.name || '—'}</td>
                          <td className="px-3 py-2.5 text-muted text-xs">{row.categoryName || '—'}</td>
                          <td className="px-3 py-2.5 text-muted text-xs">{row.unitCode || '—'}</td>
                          <td className="px-3 py-2.5 text-right text-muted text-xs whitespace-nowrap">
                            {row.salePrice != null ? formatFCFA(row.salePrice) : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {isErr ? (
                              <div className="space-y-1">
                                {row.errors.map((e, i) => (
                                  <p key={i} className="text-xs text-danger flex items-start gap-1 leading-snug">
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

              {/* Bouton d'import (action principale) */}
              {preview.validCount > 0 && (
                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Importation en cours…</>
                  ) : (
                    <><CheckCircle2 size={18} /> Importer les {pluriel(preview.validCount, 'ligne')} valide{preview.validCount !== 1 ? 's' : ''}</>
                  )}
                </Button>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
            </>
          )}

          {/* ══ ÉTAPE 3 : TERMINÉ ══ */}
          {step === 'done' && result && (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-ink">
                  {pluriel(result.imported, 'produit')} importé{result.imported !== 1 ? 's' : ''} !
                </p>
                {result.skipped > 0 && (
                  <p className="text-sm text-muted">
                    {pluriel(result.skipped, 'ligne')} ignorée{result.skipped !== 1 ? 's' : ''} (erreurs de validation)
                  </p>
                )}
              </div>
              <Button onClick={onClose} className="mt-2 px-8">
                Fermer
              </Button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {(step === 'upload' || step === 'preview') && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-line shrink-0 bg-canvas rounded-b-2xl sm:rounded-b-card">
            {step === 'preview' ? (
              <button
                onClick={() => { setStep('upload'); setError(''); }}
                disabled={loading}
                className="text-sm font-semibold text-muted hover:text-ink transition-colors disabled:opacity-40"
              >
                ← Changer de fichier
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={onClose}
              disabled={loading}
              className="text-sm font-semibold text-muted hover:text-ink transition-colors disabled:opacity-40"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM: ProductDto = {
  name: '',
  categoryId: null,
  unitId: '',
  salePrice: 0,
  sku: null,
  active: true,
};

export default function ProduitsList() {
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');

  const [modal,      setModal]      = useState<null | 'create' | Product>(null);
  const [form,       setForm]       = useState<ProductDto>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [apiErr,     setApiErr]     = useState('');
  const [nameErr,    setNameErr]    = useState('');
  const [unitErr,    setUnitErr]    = useState('');

  const reload = () => {
    setLoading(true);
    Promise.all([productsApi.list(), categoriesApi.list(), unitsApi.list()])
      .then(([p, c, u]) => { setProducts(p); setCategories(c); setUnits(u); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const categoryName = (id: string | null) =>
    categories.find(c => c.id === id)?.name ?? null;
  const unitCode = (id: string) =>
    units.find(u => u.id === id)?.code ?? null;

  const clearErrors = () => { setApiErr(''); setNameErr(''); setUnitErr(''); };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    clearErrors();
    setModal('create');
  };
  const openEdit = (p: Product) => {
    setForm({
      name:       p.name,
      categoryId: p.categoryId,
      unitId:     p.unitId,
      salePrice:  p.salePrice,
      sku:        p.sku,
      active:     p.active,
    });
    clearErrors();
    setModal(p);
  };
  const closeModal = () => setModal(null);

  const set = <K extends keyof ProductDto>(k: K) =>
    (v: ProductDto[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!form.name.trim()) { setNameErr('Le nom est requis.'); valid = false; }
    if (!form.unitId)       { setUnitErr("L'unité de mesure est requise."); valid = false; }
    if (!valid) return;
    clearErrors();
    setSaving(true);

    const dto: ProductDto = {
      name:       form.name.trim(),
      categoryId: form.categoryId || null,
      unitId:     form.unitId,
      salePrice:  Number(form.salePrice),
      sku:        form.sku?.trim() || null,
      active:     form.active,
    };

    try {
      if (modal === 'create') {
        const created = await productsApi.create(dto);
        setProducts(prev => [created, ...prev]);
      } else {
        const updated = await productsApi.update((modal as Product).id, dto);
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
      closeModal();
    } catch (err) {
      setApiErr(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const isEditing   = modal !== null && modal !== 'create';
  const filtered    = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const catOptions  = categories.map(c => ({ value: c.id, label: c.name }));
  const unitOptions = units.map(u => ({ value: u.id, label: `${u.code} — ${u.label}` }));

  return (
    <div className="space-y-5">

      <PageHeader title={<h2 className="font-display text-xl font-bold text-ink">Produits</h2>}>
        <PageActions
          primary={<Button onClick={openCreate}><Plus size={18} /> Ajouter</Button>}
          secondary={[
            { label: 'Importer', icon: <Upload size={14} />,   onClick: () => setImporting(true) },
            {
              label: 'Exporter', icon: <Download size={14} />, loading: exporting,
              onClick: () => { setExporting(true); exportApi.products().finally(() => setExporting(false)); },
            },
          ]}
        />
      </PageHeader>

      <Input
        aria-label="Rechercher un produit"
        placeholder="Rechercher un produit…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Chargement…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            search
              ? `Aucun produit ne correspond à « ${search} ».`
              : "Aucun produit pour l'instant. Ajoutez le premier."
          }
          actionLabel={!search ? 'Ajouter un produit' : undefined}
          onAction={!search ? openCreate : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(product => {
            const cat  = categoryName(product.categoryId);
            const unit = unitCode(product.unitId);
            const meta = [cat, unit, product.sku ? `SKU : ${product.sku}` : null]
              .filter(Boolean).join(' · ');
            return (
              <div
                key={product.id}
                className="bg-surface rounded-card shadow-card px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{product.name}</p>
                  {meta && <p className="text-xs text-muted mt-0.5 truncate">{meta}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-sm font-medium text-ink whitespace-nowrap">
                    {formatFCFA(Number(product.salePrice))}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => openEdit(product)}
                    className="min-h-[36px] px-3 text-sm"
                  >
                    <Pencil size={15} /> Modifier
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); reload(); }}
        />
      )}

      {modal !== null && (
        <Modal
          title={isEditing ? 'Modifier le produit' : 'Nouveau produit'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom du produit"
              required
              value={form.name}
              onChange={e => set('name')(e.target.value)}
              error={nameErr}
              placeholder="Ex. Tomate fraîche"
              autoFocus
            />
            <Select
              label="Catégorie (optionnel)"
              options={catOptions}
              placeholder="— Aucune —"
              value={form.categoryId ?? ''}
              onChange={e => set('categoryId')(e.target.value || null)}
            />
            <Select
              label="Unité de mesure *"
              options={unitOptions}
              placeholder="— Choisir une unité —"
              value={form.unitId}
              onChange={e => { set('unitId')(e.target.value); if (e.target.value) setUnitErr(''); }}
              error={unitErr}
            />
            <Input
              label="Prix de vente (FCFA)"
              type="number"
              min="0"
              step="1"
              value={form.salePrice}
              onChange={e => set('salePrice')(Number(e.target.value))}
            />
            <Input
              label="Code / SKU (optionnel)"
              value={form.sku ?? ''}
              onChange={e => set('sku')(e.target.value || null)}
              placeholder="Ex. TOMATE-001"
            />

            {apiErr && (
              <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">
                {apiErr}
              </p>
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
