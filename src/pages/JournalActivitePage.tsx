import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Calendar, ShoppingCart, TrendingDown, PackagePlus, PackageMinus,
  ChevronLeft, ChevronRight, History,
} from 'lucide-react';
import { activityApi } from '../services/activityApi';
import { useBoutique } from '../contexts/BoutiqueContext';
import type { ActivityItem, ActivityType } from '../types/activity';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';

// ── Formatters ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(n);

const fmtQuantity = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

/** Pour une date "YYYY-MM-DD" (sans heure) — évite le décalage de fuseau horaire. */
const fmtDateOnly = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const toIso = (d: Date) => d.toISOString().slice(0, 10);
const today = () => new Date();

// ── Period helpers ──────────────────────────────────────────────────────────────

type PeriodKey = 'today' | '7d' | '30d' | 'custom';

interface Period { from: string; to: string }

function periodDates(key: PeriodKey, custom: Period): Period {
  const now = today();
  switch (key) {
    case 'today':
      return { from: toIso(now), to: toIso(now) };
    case '7d':
      return { from: toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), to: toIso(now) };
    case '30d':
      return { from: toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: toIso(now) };
    case 'custom':
      return custom;
  }
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Aujourd'hui",
  '7d':  '7 jours',
  '30d': '30 jours',
  custom: 'Personnalisé',
};

// ── Type presentation ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ActivityType, { Icon: typeof ShoppingCart; bg: string; color: string }> = {
  sale:      { Icon: ShoppingCart, bg: 'bg-green-50',  color: 'text-green-600' },
  expense:   { Icon: TrendingDown, bg: 'bg-red-50',    color: 'text-red-500' },
  stock_in:  { Icon: PackagePlus,  bg: 'bg-blue-50',   color: 'text-blue-500' },
  stock_out: { Icon: PackageMinus, bg: 'bg-orange-50', color: 'text-orange-500' },
};

function AmountBadge({ item }: { item: ActivityItem }) {
  if (item.amount != null) {
    const positive = item.type === 'sale';
    return (
      <p className={`font-bold text-sm shrink-0 ${positive ? 'text-success' : 'text-danger'}`}>
        {positive ? '+' : '-'}{fmtCurrency(item.amount)}
      </p>
    );
  }
  if (item.quantity != null) {
    const positive = item.type === 'stock_in';
    return (
      <p className={`font-semibold text-sm shrink-0 ${positive ? 'text-success' : 'text-danger'}`}>
        {positive ? '+' : '-'}{fmtQuantity(item.quantity)}
      </p>
    );
  }
  return null;
}

// ── Activity row ─────────────────────────────────────────────────────────────────

function ActivityRow({ item, showStore }: { item: ActivityItem; showStore: boolean }) {
  const { Icon, bg, color } = TYPE_CONFIG[item.type];
  return (
    <div className="bg-surface rounded-card shadow-card px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={17} className={color} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm truncate">{item.label}</p>
        <p className="text-xs text-muted mt-0.5 truncate">
          {showStore && <><span className="font-medium">{item.storeName}</span> · </>}
          {item.authorName ?? 'Auteur inconnu'} · {fmtDateTime(item.occurredAt)}
        </p>
      </div>

      <AmountBadge item={item} />
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function JournalActivitePage() {
  const { boutiques, activeBoutiqueId, isAllBoutiques, isOwner } = useBoutique();

  /* ── Period filter ─────────────────────────────────── */
  const [period,     setPeriod]     = useState<PeriodKey>('30d');
  const [customFrom, setCustomFrom] = useState(toIso(new Date(today().getFullYear(), today().getMonth(), 1)));
  const [customTo,   setCustomTo]   = useState(toIso(today()));

  const dates = periodDates(period, { from: customFrom, to: customTo });

  /* ── Store filter (owner "Toutes" only) ────────────── */
  const [filterStoreId, setFilterStoreId] = useState<string>('');

  /* ── Pagination ─────────────────────────────────────── */
  const [page, setPage] = useState(0);
  const size = 20;

  /* ── Data ──────────────────────────────────────────── */
  const [items,       setItems]       = useState<ActivityItem[]>([]);
  const [totalPages,  setTotalPages]  = useState(0);
  const [totalCount,  setTotalCount]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [apiErr,      setApiErr]      = useState('');

  const storeId = activeBoutiqueId ? activeBoutiqueId : filterStoreId || undefined;

  const load = useCallback(() => {
    setLoading(true); setApiErr('');
    activityApi
      .list({ storeId, from: dates.from, to: dates.to, page, size })
      .then(res => {
        setItems(res.items);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalElements);
      })
      .catch(() => setApiErr("Impossible de charger le journal d'activité."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, dates.from, dates.to, page]);

  useEffect(() => { load(); }, [load]);

  // Revenir à la première page quand un filtre change
  useEffect(() => { setPage(0); }, [storeId, dates.from, dates.to]);

  const showStore = isOwner && (isAllBoutiques || !activeBoutiqueId);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <PageHeader title={<h1 className="font-display text-xl font-bold text-ink">Journal d'activité</h1>} />

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Period tabs */}
        <div className="flex gap-1 bg-canvas rounded-control p-1 overflow-x-auto scrollbar-none">
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map(key => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={[
                'px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap transition-colors shrink-0',
                period === key
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-muted shrink-0" /> Du
              </label>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={e => setCustomFrom(e.target.value)}
                className="w-full min-h-[40px] rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Au</label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={toIso(today())}
                onChange={e => setCustomTo(e.target.value)}
                className="w-full min-h-[40px] rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        {/* Boutique filter — owner in "Toutes" mode */}
        {isOwner && isAllBoutiques && boutiques.length > 1 && (
          <div className="flex items-center gap-2">
            <select
              value={filterStoreId}
              onChange={e => setFilterStoreId(e.target.value)}
              className="min-h-[40px] rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Toutes les boutiques</option>
              {boutiques.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Summary ─────────────────────────────────────── */}
      {!loading && !apiErr && (
        <p className="text-xs text-muted">
          {totalCount} événement{totalCount !== 1 ? 's' : ''} entre {fmtDateOnly(dates.from)} et {fmtDateOnly(dates.to)}
        </p>
      )}

      {/* ── List ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : apiErr ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <p className="text-sm text-danger">{apiErr}</p>
          <Button variant="secondary" onClick={load} className="min-h-[40px] px-4 text-sm">
            Réessayer
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center">
            <History size={24} className="text-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Aucune activité sur cette période</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Les ventes, dépenses et mouvements de stock enregistrés apparaîtront ici.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map(item => (
              <ActivityRow key={`${item.type}-${item.id}`} item={item} showStore={showStore} />
            ))}
          </div>

          {/* ── Pagination ────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="secondary"
                disabled={page <= 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="min-h-[40px] px-3 text-sm"
              >
                <ChevronLeft size={16} /> Précédent
              </Button>
              <p className="text-xs text-muted shrink-0">
                Page {page + 1} / {totalPages}
              </p>
              <Button
                variant="secondary"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="min-h-[40px] px-3 text-sm"
              >
                Suivant <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
