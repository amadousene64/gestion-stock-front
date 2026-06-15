import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Check, X, Loader2, ChevronDown, ChevronUp,
  MapPin, Trash2, Warehouse,
} from 'lucide-react';
import { boutiquesApi } from '../services/boutiquesApi';
import { locationsApi } from '../services/locationsApi';
import type { LocationDto } from '../services/locationsApi';
import { useBoutique } from '../contexts/BoutiqueContext';
import type { Boutique, BoutiqueDto } from '../types/boutique';
import type { Location } from '../types/location';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

/* ─── Constantes ──────────────────────────────────────────── */

const LOC_TYPE_LABELS: Record<string, string> = {
  store_floor:     'Rayon',
  store_warehouse: 'Entrepôt boutique',
};

const LOC_TYPE_OPTIONS = [
  { value: 'store_floor',     label: 'Rayon' },
  { value: 'store_warehouse', label: 'Entrepôt boutique' },
];

/* ─── Modale : emplacement d'une boutique ─────────────────── */

interface LocationModalProps {
  storeId: string;
  existing?: Location;
  onSuccess: (loc: Location) => void;
  onClose: () => void;
}

function LocationModal({ storeId, existing, onSuccess, onClose }: LocationModalProps) {
  const [name,    setName]    = useState(existing?.name ?? '');
  const [type,    setType]    = useState<string>(existing?.type ?? 'store_floor');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Le nom est requis.'); return; }
    setSaving(true); setErr('');
    const dto: LocationDto = { name: name.trim(), type: type as LocationDto['type'], storeId };
    try {
      const result = existing
        ? await locationsApi.update(existing.id, dto)
        : await locationsApi.create(dto);
      onSuccess(result);
    } catch (e) { setErr(extractApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      title={existing ? 'Modifier l\'emplacement' : 'Nouvel emplacement'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Nom de l'emplacement"
          required
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex. Rayon principal, Réserve, Entrepôt A"
        />
        <Select
          label="Type"
          value={type}
          onChange={e => setType(e.target.value)}
          options={LOC_TYPE_OPTIONS}
        />
        {err && <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={18} /> Annuler
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> Enregistrement…</>
              : <><Check size={18} /> {existing ? 'Mettre à jour' : 'Créer'}</>
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Modale : entrepôt commun ────────────────────────────── */

interface SharedWarehouseModalProps {
  existing?: Location;
  onSuccess: (loc: Location) => void;
  onClose: () => void;
}

function SharedWarehouseModal({ existing, onSuccess, onClose }: SharedWarehouseModalProps) {
  const [name,   setName]   = useState(existing?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Le nom est requis.'); return; }
    setSaving(true); setErr('');
    const dto: LocationDto = { name: name.trim(), type: 'shared_warehouse', storeId: null };
    try {
      const result = existing
        ? await locationsApi.update(existing.id, dto)
        : await locationsApi.create(dto);
      onSuccess(result);
    } catch (e) { setErr(extractApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      title={existing ? 'Modifier l\'entrepôt commun' : 'Nouvel entrepôt commun'}
      onClose={onClose}
    >
      <p className="text-sm text-muted mb-4">
        Un entrepôt commun est partagé entre toutes vos boutiques.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Nom de l'entrepôt"
          required
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex. Entrepôt central, Dépôt principal"
        />
        {err && <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={18} /> Annuler
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> Enregistrement…</>
              : <><Check size={18} /> {existing ? 'Mettre à jour' : 'Créer'}</>
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Section emplacements d'une boutique ─────────────────── */

interface StoreLocationsProps {
  store: Boutique;
  locations: Location[];
  onLocationsChange: (locs: Location[]) => void;
}

function StoreLocations({ store, locations, onLocationsChange }: StoreLocationsProps) {
  const storeLocs = locations.filter(l => l.storeId === store.id);

  type LocModal = null | 'create' | Location;
  const [modal,    setModal]    = useState<LocModal>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [delErr,   setDelErr]   = useState('');

  const handleCreated = (loc: Location) => {
    onLocationsChange([...locations, loc]);
    setModal(null);
  };

  const handleUpdated = (updated: Location) => {
    onLocationsChange(locations.map(l => l.id === updated.id ? updated : l));
    setModal(null);
  };

  const handleDelete = async (loc: Location) => {
    setDeleting(loc.id); setDelErr('');
    try {
      await locationsApi.remove(loc.id);
      onLocationsChange(locations.filter(l => l.id !== loc.id));
    } catch (e) { setDelErr(extractApiError(e)); }
    finally { setDeleting(null); }
  };

  return (
    <div className="border-t border-line bg-canvas px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Emplacements</p>
        <Button
          variant="ghost"
          onClick={() => setModal('create')}
          className="min-h-[32px] px-2 text-xs"
        >
          <Plus size={14} /> Ajouter
        </Button>
      </div>

      {storeLocs.length === 0 ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-sm text-muted">Aucun emplacement pour cette boutique.</p>
          <Button variant="secondary" onClick={() => setModal('create')} className="min-h-[36px] px-3 text-sm">
            <Plus size={15} /> Créer un emplacement
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {storeLocs.map(loc => (
            <div
              key={loc.id}
              className="flex items-center justify-between bg-surface rounded-control px-3 py-2 gap-2"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-500 font-medium shrink-0">
                  {LOC_TYPE_LABELS[loc.type] ?? loc.type}
                </span>
                <p className="text-sm text-ink truncate">{loc.name}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setModal(loc)}
                  className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-canvas transition-colors"
                  title="Modifier"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(loc)}
                  disabled={deleting === loc.id}
                  className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-danger hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Supprimer"
                >
                  {deleting === loc.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {delErr && (
        <p className="text-xs text-danger bg-red-50 rounded-control px-3 py-2">{delErr}</p>
      )}

      {modal === 'create' && (
        <LocationModal
          storeId={store.id}
          onSuccess={handleCreated}
          onClose={() => setModal(null)}
        />
      )}
      {modal !== null && modal !== 'create' && (
        <LocationModal
          storeId={store.id}
          existing={modal}
          onSuccess={handleUpdated}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────── */

const EMPTY_BOUTIQUE: BoutiqueDto = { name: '', address: null };

export default function BoutiquesPage() {
  const { reload: reloadContext } = useBoutique();

  const [boutiques,  setBoutiques]  = useState<Boutique[]>([]);
  const [locations,  setLocations]  = useState<Location[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Modal boutique ──────────────────────────────────── */
  type BoutiqueModal = null | 'create' | Boutique;
  const [modal,       setModal]       = useState<BoutiqueModal>(null);
  const [form,        setForm]        = useState<BoutiqueDto>(EMPTY_BOUTIQUE);
  const [createLoc,   setCreateLoc]   = useState(true);  // checkbox "rayon par défaut"
  const [saving,      setSaving]      = useState(false);
  const [apiErr,      setApiErr]      = useState('');
  const [nameErr,     setNameErr]     = useState('');

  /* ── Modal entrepôt commun ───────────────────────────── */
  type SharedModal = null | 'create' | Location;
  const [sharedModal, setSharedModal] = useState<SharedModal>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([boutiquesApi.list(), locationsApi.list()])
      .then(([bouts, locs]) => { setBoutiques(bouts); setLocations(locs); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sharedWarehouses = locations.filter(l => l.type === 'shared_warehouse');

  /* ── CRUD boutique ───────────────────────────────────── */
  const openCreate = () => {
    setForm(EMPTY_BOUTIQUE);
    setCreateLoc(true);
    setApiErr(''); setNameErr('');
    setModal('create');
  };
  const openEdit = (b: Boutique) => {
    setForm({ name: b.name, address: b.address });
    setApiErr(''); setNameErr('');
    setModal(b);
  };

  const handleBoutiqueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setNameErr('Le nom est requis.'); return; }
    setNameErr(''); setApiErr(''); setSaving(true);

    const dto: BoutiqueDto = { name: form.name.trim(), address: form.address?.trim() || null };

    try {
      if (modal === 'create') {
        const created = await boutiquesApi.create(dto);
        setBoutiques(prev => [...prev, created]);
        reloadContext();

        if (createLoc) {
          try {
            const defaultLoc = await locationsApi.create({
              name: 'Rayon principal',
              type: 'store_floor',
              storeId: created.id,
            });
            setLocations(prev => [...prev, defaultLoc]);
          } catch {
            // La boutique est créée même si l'emplacement échoue
          }
        }
        setExpandedId(created.id);
      } else {
        const updated = await boutiquesApi.update((modal as Boutique).id, dto);
        setBoutiques(prev => prev.map(b => b.id === updated.id ? updated : b));
        reloadContext();
      }
      setModal(null);
    } catch (err) {
      setApiErr(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = modal !== null && modal !== 'create';

  /* ── Entrepôts communs ────────────────────────────────── */
  const handleSharedSuccess = (loc: Location) => {
    setLocations(prev => {
      const exists = prev.find(l => l.id === loc.id);
      return exists ? prev.map(l => l.id === loc.id ? loc : l) : [...prev, loc];
    });
    setSharedModal(null);
  };

  const handleSharedDelete = async (loc: Location) => {
    try {
      await locationsApi.remove(loc.id);
      setLocations(prev => prev.filter(l => l.id !== loc.id));
    } catch (e) {
      alert(extractApiError(e));
    }
  };

  /* ── Rendu ────────────────────────────────────────────── */
  return (
    <div className="py-6 md:py-8 space-y-6">

      {/* ── Boutiques ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-xl font-bold text-ink">Boutiques</h1>
          <Button onClick={openCreate} className="shrink-0">
            <Plus size={18} /> Ajouter
          </Button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : boutiques.length === 0 ? (
          <EmptyState
            message="Aucune boutique pour l'instant. Créez la première."
            actionLabel="Ajouter une boutique"
            onAction={openCreate}
          />
        ) : (
          <div className="space-y-2">
            {boutiques.map(b => {
              const isOpen = expandedId === b.id;
              return (
                <div key={b.id} className="bg-surface rounded-card shadow-card overflow-hidden">
                  {/* Ligne boutique */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                      onClick={() => setExpandedId(isOpen ? null : b.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink truncate">{b.name}</p>
                        {b.address && (
                          <p className="text-xs text-muted mt-0.5 truncate flex items-center gap-1">
                            <MapPin size={11} /> {b.address}
                          </p>
                        )}
                        <p className="text-xs text-muted mt-0.5">
                          {locations.filter(l => l.storeId === b.id).length} emplacement
                          {locations.filter(l => l.storeId === b.id).length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isOpen
                        ? <ChevronUp size={16} className="text-muted shrink-0" />
                        : <ChevronDown size={16} className="text-muted shrink-0" />
                      }
                    </button>
                    <Button
                      variant="ghost"
                      onClick={() => openEdit(b)}
                      className="min-h-[36px] px-2 text-sm shrink-0"
                    >
                      <Pencil size={15} />
                    </Button>
                  </div>

                  {/* Section emplacements (expandable) */}
                  {isOpen && (
                    <StoreLocations
                      store={b}
                      locations={locations}
                      onLocationsChange={setLocations}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Entrepôts communs ─────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <Warehouse size={18} /> Entrepôts communs
            </h2>
            <p className="text-xs text-muted mt-0.5">Partagés entre toutes les boutiques</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setSharedModal('create')}
            className="shrink-0 min-h-[40px] px-3 text-sm"
          >
            <Plus size={16} /> Ajouter
          </Button>
        </div>

        {!loading && sharedWarehouses.length === 0 && (
          <div className="bg-surface rounded-card shadow-card px-4 py-6 text-center space-y-2">
            <p className="text-sm text-muted">Aucun entrepôt commun pour l'instant.</p>
            <Button variant="secondary" onClick={() => setSharedModal('create')} className="min-h-[36px] px-3 text-sm">
              <Plus size={15} /> Créer un entrepôt commun
            </Button>
          </div>
        )}

        {sharedWarehouses.length > 0 && (
          <div className="space-y-2">
            {sharedWarehouses.map(loc => (
              <div
                key={loc.id}
                className="bg-surface rounded-card shadow-card px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{loc.name}</p>
                  <span className="text-xs text-muted">Entrepôt commun</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    onClick={() => setSharedModal(loc)}
                    className="min-h-[36px] px-2 text-sm"
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleSharedDelete(loc)}
                    className="min-h-[36px] px-2 text-sm text-danger hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal boutique ──────────────────────────────── */}
      {modal !== null && (
        <Modal
          title={isEditing ? 'Modifier la boutique' : 'Nouvelle boutique'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleBoutiqueSubmit} className="space-y-4">
            <Input
              label="Nom de la boutique"
              required
              autoFocus
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              error={nameErr}
              placeholder="Ex. Boutique Plateau"
            />
            <Input
              label="Adresse (optionnel)"
              value={form.address ?? ''}
              onChange={e => setForm(f => ({ ...f, address: e.target.value || null }))}
              placeholder="Ex. 12 rue du Commerce, Dakar"
            />

            {!isEditing && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createLoc}
                  onChange={e => setCreateLoc(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-ink">
                  Créer un emplacement «&nbsp;Rayon principal&nbsp;» par défaut
                </span>
              </label>
            )}

            {apiErr && (
              <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{apiErr}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModal(null)} className="flex-1">
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

      {/* ── Modal entrepôt commun ────────────────────────── */}
      {sharedModal === 'create' && (
        <SharedWarehouseModal onSuccess={handleSharedSuccess} onClose={() => setSharedModal(null)} />
      )}
      {sharedModal !== null && sharedModal !== 'create' && (
        <SharedWarehouseModal
          existing={sharedModal}
          onSuccess={handleSharedSuccess}
          onClose={() => setSharedModal(null)}
        />
      )}

    </div>
  );
}
