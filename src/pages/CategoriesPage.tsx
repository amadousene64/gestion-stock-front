import { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import { categoriesApi } from '../services/catalogueApi';
import type { Category, CategoryDto } from '../types/catalogue';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

const EMPTY_FORM: CategoryDto = { name: '', parentId: null };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [modal,    setModal]    = useState<null | 'create' | Category>(null);
  const [form,     setForm]     = useState<CategoryDto>(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [apiErr,   setApiErr]   = useState('');
  const [nameErr,  setNameErr]  = useState('');

  useEffect(() => {
    categoriesApi.list()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  const parentName = (id: string | null) =>
    categories.find(c => c.id === id)?.name ?? null;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setApiErr(''); setNameErr('');
    setModal('create');
  };
  const openEdit = (c: Category) => {
    setForm({ name: c.name, parentId: c.parentId });
    setApiErr(''); setNameErr('');
    setModal(c);
  };
  const closeModal = () => setModal(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setNameErr('Le nom est requis.'); return; }
    setNameErr(''); setApiErr(''); setSaving(true);
    const dto: CategoryDto = {
      name:     form.name.trim(),
      parentId: form.parentId || null,
    };
    try {
      if (modal === 'create') {
        const created = await categoriesApi.create(dto);
        setCategories(prev => [...prev, created]);
      } else {
        const updated = await categoriesApi.update((modal as Category).id, dto);
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      }
      closeModal();
    } catch (err) {
      setApiErr(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = modal !== null && modal !== 'create';
  const editingId = isEditing ? (modal as Category).id : null;

  const parentOptions = categories
    .filter(c => c.id !== editingId)
    .map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="py-6 md:py-8 space-y-5">

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-ink">Catégories</h2>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={18} /> Ajouter
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Chargement…</p>
      ) : categories.length === 0 ? (
        <EmptyState
          message="Aucune catégorie pour l'instant. Ajoutez la première."
          actionLabel="Ajouter une catégorie"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-2">
          {categories.map(cat => {
            const parent = parentName(cat.parentId);
            return (
              <div
                key={cat.id}
                className="bg-surface rounded-card shadow-card px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{cat.name}</p>
                  {parent && (
                    <p className="text-xs text-muted mt-0.5">↳ {parent}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => openEdit(cat)}
                  className="min-h-[36px] px-3 text-sm shrink-0"
                >
                  <Pencil size={15} /> Modifier
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <Modal
          title={isEditing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom de la catégorie"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              error={nameErr}
              placeholder="Ex. Fruits & légumes"
              autoFocus
            />
            <Select
              label="Catégorie parente (optionnel)"
              options={parentOptions}
              placeholder="— Aucune —"
              value={form.parentId ?? ''}
              onChange={e => setForm(f => ({ ...f, parentId: e.target.value || null }))}
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
