import { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import { productsApi, categoriesApi, unitsApi } from '../services/catalogueApi';
import type { Product, ProductDto, Category, Unit } from '../types/catalogue';
import { formatFCFA } from '../lib/format';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

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

  const [modal,    setModal]    = useState<null | 'create' | Product>(null);
  const [form,     setForm]     = useState<ProductDto>(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [apiErr,   setApiErr]   = useState('');
  const [nameErr,  setNameErr]  = useState('');
  const [unitErr,  setUnitErr]  = useState('');

  useEffect(() => {
    Promise.all([productsApi.list(), categoriesApi.list(), unitsApi.list()])
      .then(([p, c, u]) => { setProducts(p); setCategories(c); setUnits(u); })
      .finally(() => setLoading(false));
  }, []);

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
    <div className="py-6 md:py-8 space-y-5">

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-ink">Produits</h2>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={18} /> Ajouter
        </Button>
      </div>

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
