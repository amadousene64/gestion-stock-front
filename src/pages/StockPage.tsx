import { useEffect, useMemo, useState } from 'react';
import {
  PackagePlus, ArrowLeftRight, ClipboardList, Sliders,
  ChevronDown, ChevronUp, AlertTriangle, Loader2, Check, X,
} from 'lucide-react';
import { useBoutique } from '../contexts/BoutiqueContext';
import { stockApi } from '../services/stockApi';
import type { StockPosition, StockMovement } from '../services/stockApi';
import { productsApi, unitsApi } from '../services/catalogueApi';
import { locationsApi } from '../services/locationsApi';
import type { Product, Unit } from '../types/catalogue';
import type { Location } from '../types/location';
import { extractApiError } from '../lib/apiError';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

/* ─── Constantes ──────────────────────────────────────────── */

const MOVE_LABELS: Record<string, string> = {
  purchase:     'Approvisionnement',
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
  const [tab,      setTab]     = useState<'stock' | 'mouvements'>('stock');
  const [modal,    setModal]   = useState<ModalType | null>(null);
  const [search,   setSearch]  = useState('');
  const [movProd,  setMovProd] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [movLoaded, setMovLoaded] = useState(false);

  /* ── Chargement des données de référence ─────────────── */
  const loadRef = () => {
    setLoadingRef(true);
    Promise.all([
      stockApi.getPositions(),
      productsApi.list(),
      unitsApi.list(),
      locationsApi.list(),
    ]).then(([pos, prods, us, locs]) => {
      setPositions(pos);
      setProducts(prods);
      setUnits(us);
      setLocations(locs);
    }).finally(() => setLoadingRef(false));
  };

  useEffect(() => { loadRef(); }, []);

  const loadMovements = () => {
    setLoadingMov(true);
    stockApi.getMovements()
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
    stockApi.getPositions().then(setPositions);
    if (movLoaded) stockApi.getMovements().then(setMovements);
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
    <div className="py-6 md:py-8 space-y-5">

      {/* En-tête + actions */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-ink">Stock</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button onClick={() => setModal('supply')} className="min-h-[40px] px-3 text-sm">
            <PackagePlus size={16} /> Approvisionner
          </Button>
          <Button variant="secondary" onClick={() => setModal('transfer')} className="min-h-[40px] px-3 text-sm">
            <ArrowLeftRight size={16} /> Transférer
          </Button>
          <Button variant="secondary" onClick={() => setModal('adjustment')} className="min-h-[40px] px-3 text-sm">
            <Sliders size={16} /> Ajustement
          </Button>
          <Button variant="secondary" onClick={() => setModal('inventory')} className="min-h-[40px] px-3 text-sm">
            <ClipboardList size={16} /> Inventaire
          </Button>
        </div>
      </div>

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

    </div>
  );
}
