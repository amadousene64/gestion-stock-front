import { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import { boutiquesApi } from '../services/boutiquesApi';
import { useBoutique } from '../contexts/BoutiqueContext';
import type { Boutique, BoutiqueDto } from '../types/boutique';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

const EMPTY_FORM: BoutiqueDto = { name: '', address: null };

export default function BoutiquesPage() {
  const { reload: reloadContext } = useBoutique();

  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [modal,   setModal]   = useState<null | 'create' | Boutique>(null);
  const [form,    setForm]    = useState<BoutiqueDto>(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState('');
  const [nameErr, setNameErr] = useState('');

  const load = () => {
    setLoading(true);
    boutiquesApi.list().then(setBoutiques).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setApiErr(''); setNameErr('');
    setModal('create');
  };
  const openEdit = (b: Boutique) => {
    setForm({ name: b.name, address: b.address });
    setApiErr(''); setNameErr('');
    setModal(b);
  };
  const closeModal = () => setModal(null);

  const set = <K extends keyof BoutiqueDto>(k: K) =>
    (v: BoutiqueDto[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setNameErr('Le nom est requis.'); return; }
    setNameErr(''); setApiErr(''); setSaving(true);

    const dto: BoutiqueDto = {
      name:    form.name.trim(),
      address: form.address?.trim() || null,
    };

    try {
      if (modal === 'create') {
        const created = await boutiquesApi.create(dto);
        setBoutiques(prev => [...prev, created]);
      } else {
        const updated = await boutiquesApi.update((modal as Boutique).id, dto);
        setBoutiques(prev => prev.map(b => b.id === updated.id ? updated : b));
      }
      reloadContext();
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
        <h1 className="font-display text-xl font-bold text-ink">Boutiques</h1>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={18} /> Ajouter
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Chargement…</p>
      ) : boutiques.length === 0 ? (
        <EmptyState
          message="Aucune boutique pour l'instant. Créez la première."
          actionLabel="Ajouter une boutique"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-2">
          {boutiques.map(b => (
            <div
              key={b.id}
              className="bg-surface rounded-card shadow-card px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate">{b.name}</p>
                {b.address && (
                  <p className="text-xs text-muted mt-0.5 truncate">{b.address}</p>
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => openEdit(b)}
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
          title={isEditing ? 'Modifier la boutique' : 'Nouvelle boutique'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom de la boutique"
              required
              value={form.name}
              onChange={e => set('name')(e.target.value)}
              error={nameErr}
              placeholder="Ex. Boutique Plateau"
              autoFocus
            />
            <Input
              label="Adresse (optionnel)"
              value={form.address ?? ''}
              onChange={e => set('address')(e.target.value || null)}
              placeholder="Ex. 12 rue du Commerce, Dakar"
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
