import { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import { unitsApi } from '../services/catalogueApi';
import type { Unit, UnitDto } from '../types/catalogue';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

const EMPTY_FORM: UnitDto = { code: '', label: '', allowDecimal: false };

export default function UnitesPage() {
  const [units,   setUnits]   = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal,   setModal]   = useState<null | 'create' | Unit>(null);
  const [form,    setForm]    = useState<UnitDto>(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState('');
  const [codeErr, setCodeErr] = useState('');

  useEffect(() => {
    unitsApi.list().then(setUnits).finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setApiErr(''); setCodeErr('');
    setModal('create');
  };
  const openEdit = (u: Unit) => {
    setForm({ code: u.code, label: u.label, allowDecimal: u.allowDecimal });
    setApiErr(''); setCodeErr('');
    setModal(u);
  };
  const closeModal = () => setModal(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) { setCodeErr('Le code est requis.'); return; }
    setCodeErr(''); setApiErr(''); setSaving(true);
    const dto: UnitDto = {
      code:         form.code.trim().toUpperCase(),
      label:        form.label.trim(),
      allowDecimal: form.allowDecimal,
    };
    try {
      if (modal === 'create') {
        const created = await unitsApi.create(dto);
        setUnits(prev => [...prev, created]);
      } else {
        const updated = await unitsApi.update((modal as Unit).id, dto);
        setUnits(prev => prev.map(u => u.id === updated.id ? updated : u));
      }
      closeModal();
    } catch (err) {
      setApiErr(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = modal !== null && modal !== 'create';

  return (
    <div className="py-6 md:py-8 space-y-5">

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-ink">Unités de mesure</h2>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={18} /> Ajouter
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Chargement…</p>
      ) : units.length === 0 ? (
        <EmptyState
          message="Aucune unité pour l'instant. Ajoutez la première."
          actionLabel="Ajouter une unité"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-2">
          {units.map(unit => (
            <div
              key={unit.id}
              className="bg-surface rounded-card shadow-card px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink">
                  <span className="font-mono">{unit.code}</span>
                  <span className="text-muted font-normal"> — {unit.label}</span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {unit.allowDecimal ? 'Décimales autorisées' : 'Entiers uniquement'}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => openEdit(unit)}
                className="min-h-[36px] px-3 text-sm shrink-0"
              >
                <Pencil size={15} /> Modifier
              </Button>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal
          title={isEditing ? "Modifier l'unité" : 'Nouvelle unité'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Code"
              required
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              error={codeErr}
              placeholder="Ex. KG"
              maxLength={10}
              autoFocus
            />
            <Input
              label="Libellé"
              required
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Ex. Kilogramme"
            />

            <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
              <input
                type="checkbox"
                checked={form.allowDecimal}
                onChange={e => setForm(f => ({ ...f, allowDecimal: e.target.checked }))}
                className="w-5 h-5 rounded accent-brand-500 shrink-0"
              />
              <span className="text-sm font-medium text-ink">Décimales autorisées</span>
            </label>

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
