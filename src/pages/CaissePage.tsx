import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Store, Search, Plus, Minus, Trash2, ShoppingCart,
  ChevronLeft, Loader2, AlertCircle, Check, X,
} from 'lucide-react';
import { useBoutique } from '../contexts/BoutiqueContext';
import { useTenant } from '../contexts/TenantContext';
import { productsApi, unitsApi } from '../services/catalogueApi';
import { locationsApi } from '../services/locationsApi';
import { customersApi } from '../services/customersApi';
import { salesApi } from '../services/salesApi';
import { extractApiError } from '../lib/apiError';
import SaleReceiptModal from '../components/caisse/SaleReceiptModal';
import Combobox, { type ComboboxItem } from '../components/ui/Combobox';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import type { Product } from '../types/catalogue';
import type { Unit } from '../types/catalogue';
import type { Location } from '../types/location';
import type { CartItem, SaleDetail } from '../types/sale';

/* ─── Types internes ──────────────────────────────────────── */

interface PosProduct {
  id: string;
  name: string;
  salePrice: number;
  unitCode: string;
  allowDecimal: boolean;
  active: boolean;
}

/* ─── Helpers ─────────────────────────────────────────────── */

const FR = new Intl.NumberFormat('fr-FR');
function fmt(v: number) { return FR.format(Math.round(v)); }

function cartTotal(cart: CartItem[]) {
  return cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

/* ─── Composants atomiques ────────────────────────────────── */

function QtyBtn({
  onClick, disabled, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-full flex items-center justify-center text-brand-500 hover:bg-brand-50 active:bg-brand-100 disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0"
    >
      {children}
    </button>
  );
}

/* ─── Guard boutique ──────────────────────────────────────── */

function BoutiqueGuard() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Caisse</h1>
      <div className="mt-6 rounded-card border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3">
        <Store size={20} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Sélectionnez une boutique pour ouvrir la caisse
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            La caisse fonctionne boutique par boutique. Choisissez une boutique précise dans
            le sélecteur en haut de la page.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────── */

export default function CaissePage() {
  const { isAllBoutiques, activeBoutique, activeBoutiqueId } = useBoutique();
  const { tenant } = useTenant();

  /* ── Données chargées ──────────────────────────────── */
  const [posProducts, setPosProducts] = useState<PosProduct[]>([]);
  const [locations,   setLocations]   = useState<Location[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError,   setDataError]   = useState('');

  /* ── Recherche & navigation mobile ────────────────── */
  const [search,     setSearch]     = useState('');
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Panier ────────────────────────────────────────── */
  const [cart, setCart] = useState<CartItem[]>([]);

  /* ── Options de vente ──────────────────────────────── */
  const [locationId,        setLocationId]        = useState('');
  const [kind,              setKind]              = useState<'retail' | 'wholesale'>('retail');
  const [credit,            setCredit]            = useState(false);
  const [customerId,        setCustomerId]        = useState('');
  const [selectedCustomer,  setSelectedCustomer]  = useState<ComboboxItem | null>(null);

  /* ── Nouveau client à la volée ──────────────────── */
  const [showNewCustomer,    setShowNewCustomer]    = useState(false);
  const [newCustomerName,    setNewCustomerName]    = useState('');
  const [newCustomerPhone,   setNewCustomerPhone]   = useState('');
  const [newCustomerLoading, setNewCustomerLoading] = useState(false);
  const [newCustomerError,   setNewCustomerError]   = useState('');

  /* ── Mode de paiement (comptant uniquement) ────────── */
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'orange_money' | 'wave'>('cash');

  /* ── Soumission ────────────────────────────────────── */
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [receipt,    setReceipt]    = useState<SaleDetail | null>(null);

  /* ── Chargement des données ────────────────────────── */
  useEffect(() => {
    if (!activeBoutiqueId) return;
    setDataLoading(true);
    setDataError('');

    Promise.all([
      productsApi.list(),
      unitsApi.list(),
      locationsApi.list(),
    ])
      .then(([prods, units, locs]) => {
        const unitMap = new Map<string, Unit>(units.map(u => [u.id, u]));
        const merged: PosProduct[] = prods
          .filter((p: Product) => p.active)
          .map((p: Product) => {
            const u = unitMap.get(p.unitId);
            return {
              id:           p.id,
              name:         p.name,
              salePrice:    p.salePrice,
              unitCode:     u?.code ?? '',
              allowDecimal: u?.allowDecimal ?? false,
              active:       p.active,
            };
          });
        setPosProducts(merged);

        const storeLocs = locs.filter((l: Location) => l.storeId === activeBoutiqueId);
        setLocations(storeLocs);
        if (storeLocs.length === 1) setLocationId(storeLocs[0].id);
        else setLocationId('');
      })
      .catch(() => setDataError('Impossible de charger les données. Vérifiez votre connexion.'))
      .finally(() => setDataLoading(false));
  }, [activeBoutiqueId]);

  /* ── Produits filtrés ──────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posProducts;
    return posProducts.filter(p => p.name.toLowerCase().includes(q));
  }, [posProducts, search]);

  /* ── Gestion du panier ─────────────────────────────── */
  const addToCart = (p: PosProduct) => {
    setCart(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) {
        const step = ex.allowDecimal ? 0.5 : 1;
        return prev.map(i =>
          i.productId === p.id ? { ...i, quantity: +(i.quantity + step).toFixed(3) } : i
        );
      }
      return [
        ...prev,
        {
          productId:    p.id,
          productName:  p.name,
          unitCode:     p.unitCode,
          allowDecimal: p.allowDecimal,
          quantity:     1,
          unitPrice:    p.salePrice,
        },
      ];
    });
  };

  const removeItem = (productId: string) =>
    setCart(prev => prev.filter(i => i.productId !== productId));

  const adjustQty = (productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;
      const step = item.allowDecimal ? 0.5 : 1;
      const next = +(item.quantity + delta * step).toFixed(3);
      if (next <= 0) return prev.filter(i => i.productId !== productId);
      return prev.map(i => i.productId === productId ? { ...i, quantity: next } : i);
    });
  };

  const setUnitPrice = (productId: string, val: string) => {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return;
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, unitPrice: n } : i));
  };

  const clearCart = () => {
    setCart([]);
    setKind('retail');
    setCredit(false);
    setCustomerId('');
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setApiError('');
  };

  /* ── Validation crédit → client ────────────────────── */
  const handleCreditChange = (val: boolean) => {
    setCredit(val);
    if (!val) {
      setCustomerId('');
      setSelectedCustomer(null);
    }
  };

  /* ── Recherche client (combobox) ───────────────────── */
  const customerSearch = useCallback(async (q: string): Promise<ComboboxItem[]> => {
    const results = await customersApi.search(q);
    return results.map(c => ({
      id: c.id,
      label: c.name,
      sublabel: c.phone ?? undefined,
    }));
  }, []);

  /* ── Création client à la volée ────────────────────── */
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    setNewCustomerLoading(true);
    setNewCustomerError('');
    try {
      const created = await customersApi.create({
        name:  newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
      });
      const item: ComboboxItem = {
        id:       created.id,
        label:    created.name,
        sublabel: created.phone ?? undefined,
      };
      setSelectedCustomer(item);
      setCustomerId(created.id);
      setShowNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (err) {
      setNewCustomerError(extractApiError(err));
    } finally {
      setNewCustomerLoading(false);
    }
  };

  /* ── Soumission ────────────────────────────────────── */
  const handleSubmit = async () => {
    setApiError('');
    if (cart.length === 0) return;
    if (!locationId) {
      setApiError('Sélectionnez un emplacement de stock.');
      return;
    }
    if ((credit || kind === 'wholesale') && !customerId) {
      setApiError('Un client est requis pour une vente à crédit ou en gros.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await salesApi.create({
        storeId:       activeBoutiqueId!,
        locationId,
        customerId:    customerId || undefined,
        kind,
        credit,
        paymentMethod: credit ? undefined : paymentMethod,
        items: cart.map(i => ({
          productId: i.productId,
          quantity:  i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      setReceipt(result);
      clearCart();
      setMobileView('products');
    } catch (err) {
      setApiError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Guard ─────────────────────────────────────────── */
  if (isAllBoutiques) return <BoutiqueGuard />;

  const total     = cartTotal(cart);
  const cartCount = cart.length;
  const currency  = tenant?.currency ?? 'FCFA';

  /* ────────────────────────────────────────────────────
     Panneau PRODUITS (gauche / vue mobile Produits)
  ──────────────────────────────────────────────────── */
  const productsPanel = (
    <div className="flex flex-col gap-3 min-h-0">
      {/* Barre de recherche */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          ref={searchRef}
          type="search"
          placeholder="Rechercher un produit…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 h-12 rounded-control border border-line bg-surface text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Grille produits */}
      {dataLoading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : dataError ? (
        <div className="flex items-start gap-2 text-sm text-danger bg-red-50 rounded-card px-4 py-3 mt-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {dataError}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">
          {search ? 'Aucun produit trouvé.' : 'Aucun produit actif.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 pb-24 md:pb-4">
          {filtered.map(p => {
            const inCart = cart.find(i => i.productId === p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="bg-surface rounded-card shadow-card p-3 text-left flex flex-col gap-1 hover:shadow-md hover:ring-1 hover:ring-brand-500/30 active:bg-brand-50 transition-all select-none"
              >
                <span className="text-xs font-semibold text-ink line-clamp-2 leading-tight">
                  {p.name}
                </span>
                <span className="text-xs text-muted">{p.unitCode}</span>
                <span className="mt-auto text-sm font-bold text-brand-600">
                  {fmt(p.salePrice)} <span className="text-[10px] font-normal text-muted">{currency}</span>
                </span>
                {inCart && (
                  <span className="text-[10px] text-brand-500 font-medium">
                    × {inCart.quantity} au panier
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ────────────────────────────────────────────────────
     Panneau PANIER (droite / vue mobile Panier)
  ──────────────────────────────────────────────────── */
  const cartPanel = (
    <div className="flex flex-col gap-4 pb-4">
      {/* Lignes du panier */}
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
          <ShoppingCart size={36} strokeWidth={1.5} />
          <p className="text-sm">Le panier est vide</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cart.map(item => (
            <div
              key={item.productId}
              className="bg-canvas rounded-card px-3 py-2 flex flex-col gap-1.5"
            >
              {/* Nom + supprimer */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-ink leading-tight line-clamp-2">
                  {item.productName}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="shrink-0 p-0.5 text-danger hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Quantité + prix unitaire */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Qty controls */}
                <div className="flex items-center gap-1 bg-surface border border-line rounded-full px-1">
                  <QtyBtn onClick={() => adjustQty(item.productId, -1)}>
                    <Minus size={14} />
                  </QtyBtn>
                  <span className="min-w-[32px] text-center text-sm font-semibold tabular-nums">
                    {item.allowDecimal
                      ? item.quantity % 1 === 0
                        ? item.quantity.toFixed(1)
                        : item.quantity
                      : item.quantity}
                  </span>
                  <QtyBtn onClick={() => adjustQty(item.productId, 1)}>
                    <Plus size={14} />
                  </QtyBtn>
                </div>
                <span className="text-xs text-muted">{item.unitCode}</span>

                {/* Prix unitaire éditable */}
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-xs text-muted">P.U.</span>
                  <input
                    type="number"
                    min={0}
                    step={item.allowDecimal ? 'any' : 1}
                    value={item.unitPrice}
                    onChange={e => setUnitPrice(item.productId, e.target.value)}
                    className="w-20 text-right text-sm font-semibold rounded-control border border-line bg-surface px-2 h-8 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
                  />
                </div>
              </div>

              {/* Total ligne */}
              <div className="text-right text-xs text-muted">
                Total :{' '}
                <span className="text-sm font-bold text-ink">
                  {fmt(item.unitPrice * item.quantity)} {currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Options de vente */}
      <div className="bg-surface rounded-card shadow-card px-4 py-3 space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Options de vente</p>

        {/* Type de vente */}
        <div className="flex gap-2">
          {(['retail', 'wholesale'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex-1 h-10 rounded-control text-sm font-semibold border transition-colors ${
                kind === k
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-line text-muted hover:bg-canvas'
              }`}
            >
              {k === 'retail' ? 'Détail' : 'En gros'}
            </button>
          ))}
        </div>

        {/* Mode paiement */}
        <div className="flex gap-2">
          {[false, true].map(c => (
            <button
              key={String(c)}
              type="button"
              onClick={() => handleCreditChange(c)}
              className={`flex-1 h-10 rounded-control text-sm font-semibold border transition-colors ${
                credit === c
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-line text-muted hover:bg-canvas'
              }`}
            >
              {c ? 'À crédit' : 'Comptant'}
            </button>
          ))}
        </div>

        {/* Mode de paiement (comptant uniquement) */}
        {!credit && (
          <div>
            <label className="block text-xs text-muted mb-1">Mode de paiement</label>
            <div className="flex gap-2">
              {(['cash', 'orange_money', 'wave'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 h-10 rounded-control text-xs font-semibold border transition-colors ${
                    paymentMethod === m
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-line text-muted hover:bg-canvas'
                  }`}
                >
                  {m === 'cash' ? 'Espèces' : m === 'orange_money' ? 'Orange Money' : 'Wave'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Client */}
        {(credit || kind === 'wholesale') && (
          <div>
            <label className="block text-xs text-muted mb-1">
              Client {credit ? <span className="text-danger">*</span> : ''}
            </label>
            <Combobox
              search={customerSearch}
              selected={selectedCustomer}
              onSelect={item => {
                setSelectedCustomer(item);
                setCustomerId(item?.id ?? '');
              }}
              placeholder="— Sélectionner un client —"
              searchPlaceholder="Rechercher par nom ou téléphone…"
              extra={{
                label: '+ Nouveau client',
                icon: <Plus size={16} />,
                onClick: (q) => {
                  setNewCustomerName(q);
                  setNewCustomerPhone('');
                  setNewCustomerError('');
                  setShowNewCustomer(true);
                },
              }}
            />
          </div>
        )}

        {/* Emplacement de stock */}
        {locations.length > 1 && (
          <div>
            <label className="block text-xs text-muted mb-1">Emplacement de stock</label>
            <select
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className="w-full h-12 rounded-control border border-line bg-surface text-sm text-ink px-3 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="">— Choisir un emplacement —</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}
        {locations.length === 0 && !dataLoading && (
          <p className="text-xs text-danger flex items-center gap-1">
            <AlertCircle size={13} />
            Aucun emplacement de stock pour cette boutique. Créez-en un dans le stock.
          </p>
        )}
      </div>

      {/* Erreur API */}
      {apiError && (
        <div className="flex items-start gap-2 text-sm text-danger bg-red-50 rounded-card px-4 py-3">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {apiError}
        </div>
      )}

      {/* Total + Valider */}
      <div className="bg-surface rounded-card shadow-card px-4 py-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted font-medium">TOTAL</span>
          <span className="text-2xl font-bold text-ink tabular-nums">
            {fmt(total)}{' '}
            <span className="text-base font-semibold text-muted">{currency}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || cart.length === 0 || locations.length === 0}
          className="w-full h-14 rounded-control bg-brand-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-brand-600 active:bg-brand-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? (
            <><Loader2 size={20} className="animate-spin" /> Enregistrement…</>
          ) : (
            <><ShoppingCart size={20} /> Valider la vente</>
          )}
        </button>
      </div>
    </div>
  );

  /* ────────────────────────────────────────────────────
     RENDU
  ──────────────────────────────────────────────────── */
  return (
    <>
      <div>

        {/* En-tête */}
        <div className="flex items-center justify-between mb-4">
          {/* Mobile : bouton retour depuis le panier */}
          <div className="flex items-center gap-2">
            {mobileView === 'cart' && (
              <button
                type="button"
                onClick={() => setMobileView('products')}
                className="md:hidden p-1 -ml-1 text-muted hover:text-ink"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="font-display text-xl font-bold text-ink leading-tight">
                {mobileView === 'cart' ? 'Panier' : 'Caisse'}
              </h1>
              <p className="text-xs text-muted">{activeBoutique?.name}</p>
            </div>
          </div>

          {/* Mobile : bouton panier dans l'en-tête de la vue produits */}
          {mobileView === 'products' && cartCount > 0 && (
            <button
              type="button"
              onClick={() => setMobileView('cart')}
              className="md:hidden relative p-2"
            >
              <ShoppingCart size={24} className="text-brand-500" />
              <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            </button>
          )}
        </div>

        {/* Layout desktop : 2 colonnes */}
        <div className="md:grid md:grid-cols-[1fr_360px] md:gap-5 md:items-start">

          {/* Col gauche : Produits */}
          <div className={mobileView === 'cart' ? 'hidden md:block' : 'block'}>
            {productsPanel}
          </div>

          {/* Col droite : Panier (desktop sticky, mobile vue dédiée) */}
          <div
            className={`${mobileView === 'products' ? 'hidden md:block' : 'block'} md:sticky md:top-4`}
          >
            <div className="hidden md:block mb-3">
              <p className="font-semibold text-ink">
                Panier{' '}
                {cartCount > 0 && (
                  <span className="ml-1 bg-brand-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {cartCount}
                  </span>
                )}
              </p>
            </div>
            <div className="md:max-h-[calc(100dvh-8rem)] md:overflow-y-auto md:pr-0.5">
              {cartPanel}
            </div>
          </div>
        </div>
      </div>

      {/* Barre sticky "Voir le panier" (mobile, quand panier non-vide & vue produits) */}
      {mobileView === 'products' && cartCount > 0 && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
          <button
            type="button"
            onClick={() => setMobileView('cart')}
            className="w-full h-14 bg-brand-500 text-white rounded-control font-bold text-sm flex items-center justify-between px-5 shadow-lg"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={20} />
              {cartCount} article{cartCount > 1 ? 's' : ''}
            </span>
            <span className="tabular-nums">{fmt(total)} {currency} →</span>
          </button>
        </div>
      )}

      {/* Modal ticket de caisse */}
      {receipt && (
        <SaleReceiptModal
          sale={receipt}
          tenant={tenant}
          onClose={() => setReceipt(null)}
        />
      )}

      {/* Modal nouveau client à la volée */}
      {showNewCustomer && (
        <Modal
          title="Nouveau client"
          onClose={() => { setShowNewCustomer(false); setNewCustomerError(''); }}
        >
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">Nom *</label>
              <input
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                required
                autoFocus
                placeholder="Nom du client"
                className="w-full min-h-[48px] rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Téléphone</label>
              <input
                value={newCustomerPhone}
                onChange={e => setNewCustomerPhone(e.target.value)}
                placeholder="Ex: 77 000 00 00"
                className="w-full min-h-[48px] rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            {newCustomerError && (
              <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{newCustomerError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowNewCustomer(false); setNewCustomerError(''); }}
                disabled={newCustomerLoading}
                className="flex-1"
              >
                <X size={16} /> Annuler
              </Button>
              <Button
                type="submit"
                disabled={newCustomerLoading || !newCustomerName.trim()}
                className="flex-1"
              >
                {newCustomerLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Création…</>
                  : <><Check size={16} /> Créer et sélectionner</>
                }
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
