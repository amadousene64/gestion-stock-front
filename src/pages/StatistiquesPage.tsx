import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useBoutique } from '../contexts/BoutiqueContext';
import {
  statsApi,
  type DailySales,
  type TopProduct,
  type PaymentSplit,
  type StoreRevenue,
  type CashflowDay,
  type TopDebtor,
  type Period,
} from '../services/statsApi';

// ─── Couleurs ────────────────────────────────────────────────────────────────

const C_BRAND   = '#1c4e80';
const C_SUCCESS = '#2e7d5b';
const C_DANGER  = '#c23b36';
const C_MUTED   = '#5c6776';
const C_GRID    = '#e3e7ec';

// ─── Périodes ────────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d',    label: '7 jours'  },
  { key: '30d',   label: '30 jours' },
  { key: 'month', label: 'Ce mois'  },
];

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)} k`;
  return `${Math.round(v)}`;
}

function fmtFCFA(v: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F';
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Remplissage jours manquants (graphique CA) ───────────────────────────────

function buildDateRange(period: Period): string[] {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  let start: Date;
  if (period === '7d')      { start = new Date(today); start.setDate(today.getDate() - 6); }
  else if (period === '30d'){ start = new Date(today); start.setDate(today.getDate() - 29); }
  else                      { start = new Date(today.getFullYear(), today.getMonth(), 1); }
  const dates: string[] = [];
  const d = new Date(start);
  while (d.toISOString().slice(0, 10) <= todayStr) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function fillMissing(data: DailySales[], period: Period): DailySales[] {
  const map = new Map(data.map(d => [d.date, d]));
  return buildDateRange(period).map(date => map.get(date) ?? { date, revenue: 0, count: 0 });
}

// ─── Tooltips ────────────────────────────────────────────────────────────────

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-card shadow-card px-3 py-2 text-xs">
      {children}
    </div>
  );
}

function SalesTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; payload: DailySales }[]; label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const { count } = payload[0].payload;
  return (
    <TooltipBox>
      <p className="text-muted mb-1">{fmtDate(label)}</p>
      <p className="font-semibold text-ink">{fmtFCFA(payload[0].value)}</p>
      <p className="text-muted">{count} vente{count !== 1 ? 's' : ''}</p>
    </TooltipBox>
  );
}

function ProductTooltip({ active, payload }: { active?: boolean; payload?: { payload: TopProduct }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipBox>
      <p className="font-semibold text-ink mb-1 break-words max-w-[180px]">{d.productName}</p>
      <p className="text-muted">CA : {fmtFCFA(d.totalRevenue)}</p>
      <p className="text-muted">Qté : {new Intl.NumberFormat('fr-FR').format(d.totalQuantity)}</p>
    </TooltipBox>
  );
}

function PaymentTooltip({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: PaymentSplit & { pct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <TooltipBox>
      <p className="font-semibold text-ink mb-1">{d.name}</p>
      <p className="text-muted">CA : {fmtFCFA(d.value)}</p>
      <p className="text-muted">{d.payload.pct.toFixed(1)} %</p>
    </TooltipBox>
  );
}

function StoreTooltip({ active, payload }: { active?: boolean; payload?: { payload: StoreRevenue }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipBox>
      <p className="font-semibold text-ink mb-1 break-words max-w-[180px]">{d.storeName}</p>
      <p className="text-muted">CA : {fmtFCFA(d.revenue)}</p>
      <p className="text-muted">{d.count} vente{d.count !== 1 ? 's' : ''}</p>
    </TooltipBox>
  );
}

function CashflowTooltip({ active, payload, label }: {
  active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const rev = payload.find(p => p.dataKey === 'revenue')?.value ?? 0;
  const exp = payload.find(p => p.dataKey === 'expenses')?.value ?? 0;
  const bal = rev - exp;
  return (
    <TooltipBox>
      <p className="text-muted mb-1">{fmtDate(label)}</p>
      <p className="text-ink">Recettes : <span className="font-semibold">{fmtFCFA(rev)}</span></p>
      <p className="text-ink">Dépenses : <span className="font-semibold">{fmtFCFA(exp)}</span></p>
      <p className={`font-semibold mt-1 ${bal >= 0 ? 'text-[#2e7d5b]' : 'text-[#c23b36]'}`}>
        Solde : {bal >= 0 ? '+' : ''}{fmtFCFA(bal)}
      </p>
    </TooltipBox>
  );
}

function DebtorTooltip({ active, payload }: { active?: boolean; payload?: { payload: TopDebtor }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipBox>
      <p className="font-semibold text-ink mb-1 break-words max-w-[180px]">{d.customerName}</p>
      <p className="text-[#c23b36] font-semibold">{fmtFCFA(d.debt)}</p>
    </TooltipBox>
  );
}

// ─── Étiquette camembert ──────────────────────────────────────────────────────

function PieLabel({ cx, cy, midAngle = 0, innerRadius, outerRadius, pct }: {
  cx: number; cy: number; midAngle?: number;
  innerRadius: number; outerRadius: number; pct: number;
}) {
  if (pct < 5) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text
      x={cx + r * Math.cos(-midAngle * R)}
      y={cy + r * Math.sin(-midAngle * R)}
      fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={600}
    >
      {pct.toFixed(0)}%
    </text>
  );
}

// ─── Composants utilitaires ──────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-card shadow-card p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <div className="bg-canvas rounded-control animate-pulse" style={{ height }} />;
}

function EmptyChart({ message = 'Pas encore assez de données pour cette période.' }: { message?: string }) {
  return (
    <div className="h-52 flex flex-col items-center justify-center gap-2">
      <Loader2 size={0} className="hidden" />
      <span className="text-3xl select-none">📊</span>
      <p className="text-sm text-muted text-center">{message}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StatistiquesPage() {
  const { isOwner, activeBoutiqueId, activeBoutique, isAllBoutiques } = useBoutique();

  const [period, setPeriod] = useState<Period>('30d');

  // State par graphique
  const [salesData,    setSalesData]    = useState<DailySales[]>([]);
  const [products,     setProducts]     = useState<TopProduct[]>([]);
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit[]>([]);
  const [storeRevenue, setStoreRevenue] = useState<StoreRevenue[]>([]);
  const [cashflow,     setCashflow]     = useState<CashflowDay[]>([]);
  const [debtors,      setDebtors]      = useState<TopDebtor[]>([]);

  const [loadingSales,    setLoadingSales]    = useState(true);
  const [loadingProds,    setLoadingProds]    = useState(true);
  const [loadingPay,      setLoadingPay]      = useState(true);
  const [loadingStore,    setLoadingStore]    = useState(true);
  const [loadingCashflow, setLoadingCashflow] = useState(true);
  const [loadingDebtors,  setLoadingDebtors]  = useState(true);

  const [errSales,    setErrSales]    = useState('');
  const [errProds,    setErrProds]    = useState('');
  const [errPay,      setErrPay]      = useState('');
  const [errStore,    setErrStore]    = useState('');
  const [errCashflow, setErrCashflow] = useState('');
  const [errDebtors,  setErrDebtors]  = useState('');

  // Graphiques dépendants de la période + boutique
  useEffect(() => {
    if (!isOwner) return;
    let dead = false;
    const params = { period, storeId: activeBoutiqueId };

    setSalesData([]);    setErrSales('');    setLoadingSales(true);
    setProducts([]);     setErrProds('');    setLoadingProds(true);
    setPaymentSplit([]); setErrPay('');      setLoadingPay(true);
    setStoreRevenue([]); setErrStore('');    setLoadingStore(true);
    setCashflow([]);     setErrCashflow(''); setLoadingCashflow(true);

    statsApi.getSalesByDay(params)
      .then(d  => { if (!dead) setSalesData(d); })
      .catch(() => { if (!dead) setErrSales('Impossible de charger les données.'); })
      .finally(() => { if (!dead) setLoadingSales(false); });

    statsApi.getTopProducts(params)
      .then(d  => { if (!dead) setProducts(d); })
      .catch(() => { if (!dead) setErrProds('Impossible de charger les données.'); })
      .finally(() => { if (!dead) setLoadingProds(false); });

    statsApi.getPaymentSplit(params)
      .then(d  => { if (!dead) setPaymentSplit(d); })
      .catch(() => { if (!dead) setErrPay('Impossible de charger les données.'); })
      .finally(() => { if (!dead) setLoadingPay(false); });

    statsApi.getRevenueByStore(period)
      .then(d  => { if (!dead) setStoreRevenue(d); })
      .catch(() => { if (!dead) setErrStore('Impossible de charger les données.'); })
      .finally(() => { if (!dead) setLoadingStore(false); });

    statsApi.getCashflow(params)
      .then(d  => { if (!dead) setCashflow(d); })
      .catch(() => { if (!dead) setErrCashflow('Impossible de charger les données.'); })
      .finally(() => { if (!dead) setLoadingCashflow(false); });

    return () => { dead = true; };
  }, [period, activeBoutiqueId, isOwner]);

  // Top débiteurs — indépendant de la période et de la boutique
  useEffect(() => {
    if (!isOwner) return;
    let dead = false;
    setDebtors([]); setErrDebtors(''); setLoadingDebtors(true);
    statsApi.getTopDebtors()
      .then(d  => { if (!dead) setDebtors(d); })
      .catch(() => { if (!dead) setErrDebtors('Impossible de charger les données.'); })
      .finally(() => { if (!dead) setLoadingDebtors(false); });
    return () => { dead = true; };
  }, [isOwner]);

  if (!isOwner) return <Navigate to="/" replace />;

  // ── Dérivations ───────────────────────────────────────────────────────────

  const chartData  = fillMissing(salesData, period);
  const hasRevenue = chartData.some(d => d.revenue > 0);
  const xInterval  = period === '7d' ? 0 : period === 'month' ? 4 : 6;

  const barHeight  = Math.max(200, products.length * 44 + 40);

  const totalPayRev = paymentSplit.reduce((s, r) => s + r.revenue, 0);
  const pieData = paymentSplit.map(r => ({
    ...r,
    name: r.mode === 'comptant' ? 'Comptant' : 'Crédit',
    pct:  totalPayRev > 0 ? (r.revenue / totalPayRev) * 100 : 0,
  }));

  const storeBarsH = Math.max(200, storeRevenue.length * 48 + 40);

  const hasCashflow  = cashflow.some(d => d.revenue > 0 || d.expenses > 0);
  const cashflowH    = Math.max(220, 220);
  const cfXInterval  = period === '7d' ? 0 : period === 'month' ? 4 : 6;

  const debtorBarsH  = Math.max(200, debtors.length * 44 + 40);

  const scopeLabel = isAllBoutiques ? 'Tout le réseau' : (activeBoutique?.name ?? '—');

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Statistiques</h1>
          <p className="text-sm text-muted mt-0.5">{scopeLabel}</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`text-xs px-3 py-2 rounded-control border font-medium transition-colors
                ${period === key
                  ? 'bg-ink text-white border-ink'
                  : 'bg-surface text-muted border-line hover:border-ink hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Graphique 1 : Évolution du CA ─────────────────────────────────── */}
      <ChartCard title="Évolution du chiffre d'affaires">
        {loadingSales ? <ChartSkeleton /> : errSales ? <EmptyChart message={errSales} /> : !hasRevenue ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate}
                tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false} interval={xInterval} />
              <YAxis tickFormatter={fmtK}
                tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false} width={52} />
              <Tooltip content={<SalesTooltip />} />
              <Line type="monotone" dataKey="revenue" stroke={C_BRAND} strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: C_BRAND, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Graphique 2 : Produits les plus vendus ───────────────────────── */}
      <ChartCard title="Produits les plus vendus">
        {loadingProds ? <ChartSkeleton /> : errProds ? <EmptyChart message={errProds} /> : products.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart data={products} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} horizontal={false} />
              <XAxis type="number" tickFormatter={fmtK}
                tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="productName" width={120}
                tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false}
                tickFormatter={(n: string) => n.length > 18 ? n.slice(0, 17) + '…' : n} />
              <Tooltip content={<ProductTooltip />} />
              <Bar dataKey="totalRevenue" fill={C_SUCCESS} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Graphique 3 : Répartition comptant / crédit ──────────────────── */}
      <ChartCard title="Répartition comptant / crédit">
        {loadingPay ? <ChartSkeleton /> : errPay ? <EmptyChart message={errPay} /> : pieData.length === 0 || totalPayRev === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="revenue" nameKey="name"
                  cx="50%" cy="50%" outerRadius={90}
                  labelLine={false}
                  label={(props) => <PieLabel {...props} pct={props.payload.pct} />}
                >
                  {pieData.map(entry => (
                    <Cell key={entry.mode} fill={entry.mode === 'comptant' ? C_BRAND : C_DANGER} />
                  ))}
                </Pie>
                <Tooltip content={<PaymentTooltip />} />
                <Legend iconType="circle" iconSize={10}
                  formatter={(v) => <span className="text-xs text-ink">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>

            <div className="w-full sm:w-48 shrink-0 space-y-2 text-xs">
              {pieData.map(row => (
                <div key={row.mode}
                  className="flex justify-between gap-2 border-b border-line pb-1 last:border-0">
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: row.mode === 'comptant' ? C_BRAND : C_DANGER }} />
                    {row.name}
                  </span>
                  <span className="text-muted text-right">
                    {fmtFCFA(row.revenue)}<br />
                    <span className="text-[10px]">{row.count} vente{row.count !== 1 ? 's' : ''}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Graphique 4 : CA par boutique (all boutiques uniquement) ─────── */}
      {isAllBoutiques && (
        <ChartCard title="Chiffre d'affaires par boutique">
          {loadingStore ? <ChartSkeleton /> : errStore ? <EmptyChart message={errStore} /> : storeRevenue.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={storeBarsH}>
              <BarChart data={storeRevenue} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} horizontal={false} />
                <XAxis type="number" tickFormatter={fmtK}
                  tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="storeName" width={110}
                  tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false}
                  tickFormatter={(n: string) => n.length > 16 ? n.slice(0, 15) + '…' : n} />
                <Tooltip content={<StoreTooltip />} />
                <Bar dataKey="revenue" fill={C_SUCCESS} radius={[0, 4, 4, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}

      {/* ── Graphique 5 : Dépenses vs Recettes ──────────────────────────── */}
      <ChartCard
        title="Dépenses vs Recettes encaissées"
        subtitle="Recettes = ventes comptant uniquement · Dépenses selon la boutique active"
      >
        {loadingCashflow ? <ChartSkeleton height={cashflowH} /> : errCashflow ? (
          <EmptyChart message={errCashflow} />
        ) : !hasCashflow ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={cashflowH}>
            <ComposedChart data={cashflow} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate}
                tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false}
                interval={cfXInterval} />
              <YAxis tickFormatter={fmtK}
                tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false} width={52} />
              <Tooltip content={<CashflowTooltip />} />
              <ReferenceLine y={0} stroke={C_MUTED} strokeDasharray="3 3" />
              <Legend
                iconType="square" iconSize={10}
                formatter={(v) => (
                  <span className="text-xs text-ink">
                    {v === 'revenue' ? 'Recettes' : 'Dépenses'}
                  </span>
                )}
              />
              <Bar dataKey="revenue"  name="revenue"  fill={C_BRAND}  radius={[2, 2, 0, 0]} barSize={period === '7d' ? 18 : 8} />
              <Bar dataKey="expenses" name="expenses" fill={C_DANGER} radius={[2, 2, 0, 0]} barSize={period === '7d' ? 18 : 8} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Graphique 6 : Top débiteurs ─────────────────────────────────── */}
      <ChartCard
        title="Clients avec le plus de dettes"
        subtitle="Soldes actuels · Global au commerce (toutes boutiques)"
      >
        {loadingDebtors ? <ChartSkeleton /> : errDebtors ? (
          <EmptyChart message={errDebtors} />
        ) : debtors.length === 0 ? (
          <EmptyChart message="Aucun client n'a de dette en cours." />
        ) : (
          <ResponsiveContainer width="100%" height={debtorBarsH}>
            <BarChart data={debtors} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} horizontal={false} />
              <XAxis type="number" tickFormatter={fmtK}
                tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="customerName" width={120}
                tick={{ fontSize: 11, fill: C_MUTED }} tickLine={false} axisLine={false}
                tickFormatter={(n: string) => n.length > 18 ? n.slice(0, 17) + '…' : n} />
              <Tooltip content={<DebtorTooltip />} />
              <Bar dataKey="debt" fill={C_DANGER} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

    </div>
  );
}
