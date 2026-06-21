import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Download, Loader2, Search, X, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { salesApi } from '../services/salesApi';
import { invoicesApi } from '../services/invoicesApi';
import { exportApi } from '../services/exportApi';
import { useBoutique } from '../contexts/BoutiqueContext';
import { useSubscription } from '../hooks/useSubscription';
import type { SaleSummary, SaleDetail } from '../types/sale';
import { formatFCFA } from '../lib/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isoDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── SaleRow ──────────────────────────────────────────────────────────────────

function SaleRow({ sale }: { sale: SaleSummary }) {
  const [open,          setOpen]          = useState(false);
  const [detail,        setDetail]        = useState<SaleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingPdf,    setLoadingPdf]    = useState(false);
  const [errDetail,     setErrDetail]     = useState('');

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (detail) return;
    setLoadingDetail(true); setErrDetail('');
    try {
      setDetail(await salesApi.get(sale.id));
    } catch {
      setErrDetail('Impossible de charger le détail.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const downloadInvoicePdf = async () => {
    setLoadingPdf(true);
    try {
      const inv  = await invoicesApi.getBySaleId(sale.id);
      const blob = await invoicesApi.getPdfBlob(inv.id);
      downloadBlob(blob, `${inv.number}.pdf`);
    } catch {
      // silently ignore
    } finally {
      setLoadingPdf(false);
    }
  };

  const isWholesale = sale.kind === 'wholesale';
  const payColor    = sale.credit ? 'text-red-500' : 'text-emerald-600';
  const payLabel    = sale.credit ? 'Crédit' : 'Comptant';
  const kindLabel   = isWholesale ? 'En gros' : 'Détail';

  return (
    <div className="border-b border-line last:border-0">
      {/* Summary row */}
      <button
        onClick={toggle}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-canvas transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink">
              {sale.customerName ?? 'Comptant'}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-canvas text-muted border border-line">
              {kindLabel}
            </span>
            <span className={`text-xs font-medium ${payColor}`}>{payLabel}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
            <span>{sale.storeName}</span>
            <span>·</span>
            <span>{fmtDateTime(sale.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-ink">{formatFCFA(sale.total)}</span>
          {open
            ? <ChevronUp size={15} className="text-muted" />
            : <ChevronDown size={15} className="text-muted" />
          }
        </div>
      </button>

      {/* Detail accordion */}
      {open && (
        <div className="bg-canvas px-4 pb-4 pt-1">
          {loadingDetail && (
            <p className="flex items-center gap-2 text-sm text-muted py-3">
              <Loader2 size={14} className="animate-spin" /> Chargement…
            </p>
          )}
          {errDetail && (
            <p className="text-sm text-red-500 py-2">{errDetail}</p>
          )}
          {detail && (
            <>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm min-w-[300px]">
                  <thead>
                    <tr className="text-xs text-muted uppercase border-b border-line">
                      <th className="text-left py-1.5 font-medium">Produit</th>
                      <th className="text-right py-1.5 font-medium">Qté</th>
                      <th className="text-right py-1.5 font-medium">P.U.</th>
                      <th className="text-right py-1.5 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {detail.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2 text-ink">{item.productName}</td>
                        <td className="py-2 text-right text-muted">{item.quantity}</td>
                        <td className="py-2 text-right text-muted">{formatFCFA(item.unitPrice)}</td>
                        <td className="py-2 text-right font-medium text-ink">{formatFCFA(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink">
                      <td colSpan={3} className="pt-2 text-sm font-semibold text-ink">Total</td>
                      <td className="pt-2 text-right text-sm font-bold text-ink">
                        {formatFCFA(detail.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {isWholesale ? (
                <Button
                  onClick={downloadInvoicePdf}
                  disabled={loadingPdf}
                  className="mt-4 w-full"
                >
                  {loadingPdf
                    ? <><Loader2 size={15} className="animate-spin" /> Génération…</>
                    : <><Download size={15} /> Télécharger la facture</>
                  }
                </Button>
              ) : (
                <p className="text-xs text-muted mt-3 text-center italic">
                  Vente au détail — ticket de caisse
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

interface Filters {
  dateFrom:    string;
  dateTo:      string;
  clientSearch: string;
  storeId:     string;
  paymentMode: 'all' | 'cash' | 'credit';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VentesPage() {
  const navigate = useNavigate();
  const { hasFeature } = useSubscription();
  const { boutiques, activeBoutiqueId, isOwner } = useBoutique();

  const [sales,     setSales]     = useState<SaleSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [exporting, setExporting] = useState(false);

  const initFilters = (): Filters => ({
    dateFrom: '', dateTo: '', clientSearch: '',
    storeId: activeBoutiqueId ?? '',
    paymentMode: 'all',
  });

  const [filters, setFilters] = useState<Filters>(initFilters);

  // Synchronise le filtre boutique quand la sélection globale change
  useEffect(() => {
    setFilters(prev => ({ ...prev, storeId: activeBoutiqueId ?? '' }));
  }, [activeBoutiqueId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    salesApi.list(filters.storeId || null)
      .then(data => { if (!cancelled) { setSales(data); setError(''); } })
      .catch(() => { if (!cancelled) setError('Impossible de charger les ventes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.storeId]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const filtered = useMemo(() => {
    return sales.filter(s => {
      if (filters.clientSearch.trim()) {
        const q = filters.clientSearch.toLowerCase();
        if (!(s.customerName ?? 'comptant').toLowerCase().includes(q)) return false;
      }
      if (filters.paymentMode === 'cash'   &&  s.credit) return false;
      if (filters.paymentMode === 'credit' && !s.credit) return false;
      if (filters.dateFrom && isoDate(s.createdAt) < filters.dateFrom) return false;
      if (filters.dateTo   && isoDate(s.createdAt) > filters.dateTo)   return false;
      return true;
    });
  }, [sales, filters]);

  const hasActiveFilters =
    !!filters.dateFrom || !!filters.dateTo || !!filters.clientSearch ||
    !!filters.storeId  || filters.paymentMode !== 'all';

  const resetFilters = () => setFilters(initFilters());

  const inputCls = 'w-full text-sm border border-line rounded-control px-3 py-2 bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-brand-500';

  return (
    <div className="space-y-6">
      <PageHeader
        title={<h1 className="font-display text-2xl font-bold text-ink">Historique des ventes</h1>}
        className="mb-5"
      >
        <button
          onClick={() => {
            if (!hasFeature('EXPORT')) { navigate('/abonnement'); return; }
            setExporting(true);
            exportApi.sales({
              storeId:      filters.storeId,
              dateFrom:     filters.dateFrom,
              dateTo:       filters.dateTo,
              paymentMode:  filters.paymentMode,
              clientSearch: filters.clientSearch,
            }).finally(() => setExporting(false));
          }}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 min-h-[48px] px-3 text-sm font-semibold rounded-control border border-line bg-surface text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : hasFeature('EXPORT') ? <Download size={14} /> : <Lock size={14} />}
          {hasFeature('EXPORT') ? 'Exporter' : 'Exporter (Pro)'}
        </button>
      </PageHeader>

      {/* ── Filters ── */}
      <div className="bg-surface border border-line rounded-card p-4 mb-4 space-y-3">

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted mb-1 block">Du</label>
            <input type="date" value={filters.dateFrom}
              onChange={e => setFilter('dateFrom', e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Au</label>
            <input type="date" value={filters.dateTo}
              onChange={e => setFilter('dateTo', e.target.value)}
              className={inputCls} />
          </div>
        </div>

        {/* Client search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un client…"
            value={filters.clientSearch}
            onChange={e => setFilter('clientSearch', e.target.value)}
            className={`${inputCls} pl-8`}
          />
        </div>

        {/* Store filter — owner with multiple stores only */}
        {isOwner && boutiques.length > 1 && (
          <select
            value={filters.storeId}
            onChange={e => setFilter('storeId', e.target.value)}
            className={inputCls}
          >
            <option value="">Toutes les boutiques</option>
            {boutiques.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        {/* Payment mode toggle */}
        <div className="flex gap-2">
          {(['all', 'cash', 'credit'] as const).map(mode => {
            const labels = { all: 'Tous', cash: 'Comptant', credit: 'Crédit' };
            const active = filters.paymentMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setFilter('paymentMode', mode)}
                className={`flex-1 text-xs py-1.5 rounded-control border font-medium transition-colors
                  ${active
                    ? 'bg-ink text-white border-ink'
                    : 'bg-canvas text-muted border-line hover:border-ink hover:text-ink'}`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
          >
            <X size={12} /> Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* ── Count ── */}
      {!loading && !error && (
        <p className="text-xs text-muted mb-3">
          {filtered.length === 0
            ? 'Aucune vente'
            : `${filtered.length} vente${filtered.length > 1 ? 's' : ''}`}
          {filtered.length !== sales.length && ` (sur ${sales.length} au total)`}
        </p>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted" size={28} />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="text-center py-10">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">🛒</p>
          <p className="text-ink font-semibold">Aucune vente trouvée</p>
          <p className="text-sm text-muted max-w-xs mx-auto">
            {hasActiveFilters
              ? 'Essayez de modifier les filtres pour voir plus de résultats.'
              : 'Les ventes apparaîtront ici dès qu\'elles sont enregistrées.'}
          </p>
        </div>
      )}

      {/* ── List ── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="border border-line rounded-card overflow-hidden bg-surface">
          {filtered.map(sale => (
            <SaleRow key={sale.id} sale={sale} />
          ))}
        </div>
      )}
    </div>
  );
}
