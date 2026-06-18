import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, Check, Loader2, Phone, ChevronRight, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { exportApi } from '../services/exportApi';
import { importApi } from '../services/importApi';
import type { CustomerImportPreview, CustomerImportRow } from '../services/importApi';
import { customersApi } from '../services/customersApi';
import type { Customer } from '../types/customer';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import PageActions from '../components/ui/PageActions';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

// ─── Import Modal ─────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'preview' | 'done';

function CustomerImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step,      setStep]      = useState<ImportStep>('upload');
  const [file,      setFile]      = useState<File | null>(null);
  const [preview,   setPreview]   = useState<CustomerImportPreview | null>(null);
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
    setLoading(true); setError('');
    try {
      setPreview(await importApi.previewCustomers(file));
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la lecture du fichier');
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const r = await importApi.confirmCustomers(file);
      setImported(r.imported);
      setStep('done');
      onImported();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'importation");
    } finally { setLoading(false); }
  };

  const handleDownloadTemplate = async () => {
    setDlLoading(true); setError('');
    try { await importApi.downloadCustomerTemplate(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur lors du téléchargement du modèle'); }
    finally { setDlLoading(false); }
  };

  const pluriel = (n: number, w: string) => `${n} ${w}${n !== 1 ? 's' : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
      <div className="bg-surface rounded-t-2xl sm:rounded-card shadow-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-brand-500 shrink-0" />
            <h2 className="font-display text-base font-bold text-ink">
              {step === 'upload'  && 'Importer des clients (Excel)'}
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
              <div className="flex items-start gap-3 bg-canvas rounded-xl border border-line p-4">
                <Download size={18} className="text-brand-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-ink">Pas encore de modèle ?</p>
                  <p className="text-xs text-muted">Colonnes : <strong>Nom *</strong> | <strong>Téléphone *</strong></p>
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
                  <Button onClick={handlePreview} disabled={loading} className="w-full">
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
                <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
                <p className="text-sm text-danger">{error}</p>
              </div>}
            </>
          )}

          {step === 'preview' && preview && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{preview.validCount}</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">client{preview.validCount !== 1 ? 's' : ''} à importer</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${preview.errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-canvas border-line'}`}>
                  <p className={`text-2xl font-bold ${preview.errorCount > 0 ? 'text-danger' : 'text-muted'}`}>{preview.errorCount}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${preview.errorCount > 0 ? 'text-danger' : 'text-muted'}`}>ligne{preview.errorCount !== 1 ? 's' : ''} en erreur</p>
                </div>
              </div>

              {preview.validCount === 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center space-y-1">
                  <p className="text-sm font-bold text-danger">Aucune ligne importable</p>
                  <p className="text-xs text-muted">Corrigez les erreurs dans votre fichier et recommencez.</p>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="text-xs text-muted uppercase bg-canvas border-b border-line">
                      <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-medium">Nom</th>
                      <th className="px-3 py-2.5 text-left font-medium">Téléphone</th>
                      <th className="px-3 py-2.5 text-left font-medium">Statut / Erreur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.rows.map((row: CustomerImportRow) => {
                      const isErr = row.status === 'error';
                      return (
                        <tr key={row.rowNumber} className={isErr ? 'bg-red-50/70' : 'bg-emerald-50/30'}>
                          <td className="px-3 py-2.5 text-xs text-muted">{row.rowNumber}</td>
                          <td className="px-3 py-2.5 font-medium text-ink">{row.name || '—'}</td>
                          <td className="px-3 py-2.5 text-muted text-xs">{row.phone || '—'}</td>
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
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Importation en cours…</> : <><CheckCircle2 size={18} /> Importer les {pluriel(preview.validCount, 'client')} valide{preview.validCount !== 1 ? 's' : ''}</>}
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
                <p className="text-xl font-bold text-ink">{pluriel(imported, 'client')} importé{imported !== 1 ? 's' : ''} !</p>
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

// ──────────────────────────────────────────────────────────────────────────────

type CustomerForm = { name: string; phone: string };
const EMPTY_FORM: CustomerForm = { name: '', phone: '' };

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  type ModalState = null | 'create' | Customer;
  const [modal,     setModal]     = useState<ModalState>(null);
  const [form,      setForm]      = useState<CustomerForm>(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [apiErr,    setApiErr]    = useState('');
  const [nameErr,   setNameErr]   = useState('');

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

  const openEdit = (c: Customer, e: React.MouseEvent) => {
    e.preventDefault();
    setForm({ name: c.name, phone: c.phone ?? '' });
    setApiErr(''); setNameErr('');
    setModal(c);
  };

  const closeModal = () => setModal(null);

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
    <div className="space-y-5">

      <PageHeader title={<h1 className="font-display text-xl font-bold text-ink">Clients</h1>}>
        <PageActions
          primary={<Button onClick={openCreate}><Plus size={18} /> Ajouter</Button>}
          secondary={[
            { label: 'Importer', icon: <Upload size={14} />,   onClick: () => setImporting(true) },
            {
              label: 'Exporter', icon: <Download size={14} />, loading: exporting,
              onClick: () => { setExporting(true); exportApi.customers().finally(() => setExporting(false)); },
            },
          ]}
        />
      </PageHeader>

      <Input
        label=""
        placeholder="Rechercher un client…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

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
            <div
              key={c.id}
              className="w-full bg-surface rounded-card shadow-card flex items-center hover:shadow-md transition-shadow"
            >
              <Link
                to={`/clients/${c.id}`}
                className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{c.name}</p>
                  {c.phone && (
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <Phone size={12} /> {c.phone}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {importing && (
        <CustomerImportModal
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); load(); }}
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
