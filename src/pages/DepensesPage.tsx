import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Loader2, Check, X, TrendingDown, Calendar } from 'lucide-react';
import { expensesApi } from '../services/expensesApi';
import { useBoutique } from '../contexts/BoutiqueContext';
import { extractApiError } from '../lib/apiError';
import type { Expense } from '../types/expense';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

// ── Formatters ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(n);

const fmtDateDisplay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const toIso = (d: Date) => d.toISOString().slice(0, 10);

const today = () => new Date();

// ── Period helpers ──────────────────────────────────────────────────────────────

type PeriodKey = 'month' | 'quarter' | 'year' | 'custom';

interface Period { from: string; to: string }

function periodDates(key: PeriodKey, custom: Period): Period {
  const now = today();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (key) {
    case 'month':
      return { from: toIso(new Date(y, m, 1)), to: toIso(now) };
    case 'quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return { from: toIso(new Date(y, qStart, 1)), to: toIso(now) };
    }
    case 'year':
      return { from: toIso(new Date(y, 0, 1)), to: toIso(now) };
    case 'custom':
      return custom;
  }
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  month:   'Ce mois',
  quarter: 'Ce trimestre',
  year:    'Cette année',
  custom:  'Personnalisé',
};

// ── Create expense modal ────────────────────────────────────────────────────────

interface CreateModalProps {
  boutiques: { id: string; name: string }[];
  defaultStoreId: string;
  onSuccess: (e: Expense) => void;
  onClose: () => void;
}

function CreateModal({ boutiques, defaultStoreId, onSuccess, onClose }: CreateModalProps) {
  const [storeId, setStoreId]   = useState(defaultStoreId);
  const [amount,  setAmount]    = useState('');
  const [reason,  setReason]    = useState('');
  const [date,    setDate]      = useState(toIso(today()));
  const [saving,  setSaving]    = useState(false);
  const [err,     setErr]       = useState('');

  const showStoreSelect = boutiques.length > 1 && !defaultStoreId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(amount);
    if (!reason.trim())    { setErr('Le motif est requis.'); return; }
    if (!(amtNum > 0))     { setErr('Le montant doit être supérieur à 0.'); return; }
    if (!storeId)          { setErr('Veuillez sélectionner une boutique.'); return; }

    setSaving(true); setErr('');
    try {
      const expense = await expensesApi.create({
        storeId,
        amount: amtNum,
        reason: reason.trim(),
        expenseDate: date,
      });
      onSuccess(expense);
    } catch (err) {
      setErr(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nouvelle dépense" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Boutique — uniquement si owner en mode "Toutes les boutiques" */}
        {showStoreSelect && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">
              Boutique <span className="text-danger">*</span>
            </label>
            <select
              required
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
              className="min-h-[48px] w-full rounded-control border border-line bg-surface px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Choisir une boutique…</option>
              {boutiques.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Montant */}
        <Input
          label="Montant (FCFA)"
          type="number"
          min="1"
          step="1"
          required
          autoFocus
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Ex. 15 000"
        />

        {/* Motif */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">
            Motif / Description <span className="text-danger">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex. Achat de fournitures, loyer, carburant…"
            className="w-full rounded-control border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Date */}
        <Input
          label="Date de la dépense"
          type="date"
          required
          value={date}
          max={toIso(today())}
          onChange={e => setDate(e.target.value)}
        />

        {err && (
          <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={16} /> Annuler
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
              : <><Check size={16} /> Enregistrer</>
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Expense row ─────────────────────────────────────────────────────────────────

function ExpenseRow({ expense, showStore }: { expense: Expense; showStore: boolean }) {
  return (
    <div className="bg-surface rounded-card shadow-card px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
        <TrendingDown size={17} className="text-red-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm truncate">{expense.reason}</p>
        <p className="text-xs text-muted mt-0.5 truncate">
          {showStore && <><span className="font-medium">{expense.storeName}</span> · </>}
          {expense.createdByName} · {fmtDateDisplay(expense.expenseDate)}
        </p>
      </div>

      <p className="font-bold text-danger shrink-0 text-sm">
        -{fmtCurrency(expense.amount)}
      </p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function DepensesPage() {
  const { boutiques, activeBoutiqueId, isAllBoutiques, isOwner } = useBoutique();

  /* ── Period filter ─────────────────────────────────── */
  const [period,     setPeriod]     = useState<PeriodKey>('month');
  const [customFrom, setCustomFrom] = useState(toIso(new Date(today().getFullYear(), today().getMonth(), 1)));
  const [customTo,   setCustomTo]   = useState(toIso(today()));

  const dates = useMemo(() => periodDates(period, { from: customFrom, to: customTo }), [period, customFrom, customTo]);

  /* ── Store filter (owner "Toutes" only) ────────────── */
  const [filterStoreId, setFilterStoreId] = useState<string>('');

  /* ── Data ──────────────────────────────────────────── */
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [apiErr,   setApiErr]   = useState('');

  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setApiErr('');

    // storeId param : boutique active > filtre owner > rien (owner voit tout)
    const storeId = activeBoutiqueId
      ? activeBoutiqueId
      : filterStoreId || undefined;

    expensesApi
      .list({ storeId, from: dates.from, to: dates.to })
      .then(setExpenses)
      .catch(() => setApiErr('Impossible de charger les dépenses.'))
      .finally(() => setLoading(false));
  }, [activeBoutiqueId, filterStoreId, dates.from, dates.to]);

  useEffect(() => { load(); }, [load]);

  /* ── Computed ──────────────────────────────────────── */
  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const showStore = isOwner && (isAllBoutiques || !activeBoutiqueId);

  /* ── Handler ───────────────────────────────────────── */
  const handleCreated = (expense: Expense) => {
    setShowCreate(false);
    // Ajouter localement si dans la période et boutique sélectionnée
    const inPeriod = expense.expenseDate >= dates.from && expense.expenseDate <= dates.to;
    const inStore  = !activeBoutiqueId || expense.storeId === activeBoutiqueId;
    if (inPeriod && inStore) {
      setExpenses(prev =>
        [expense, ...prev].sort((a, b) =>
          b.expenseDate.localeCompare(a.expenseDate) || b.createdAt.localeCompare(a.createdAt)
        )
      );
    }
  };

  /* ── Determine default storeId for create modal ─────── */
  const createDefaultStoreId = activeBoutiqueId ?? '';

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <PageHeader title={<h1 className="font-display text-xl font-bold text-ink">Dépenses</h1>}>
        <Button onClick={() => setShowCreate(true)}><Plus size={18} /> Enregistrer</Button>
      </PageHeader>

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

      {/* ── Summary banner ──────────────────────────────── */}
      {!loading && !apiErr && (
        <div className="bg-red-50 border border-red-100 rounded-card px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">
              Total des dépenses
            </p>
            <p className="font-display text-2xl font-bold text-danger mt-0.5">
              {fmtCurrency(total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">
              {expenses.length} dépense{expenses.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {fmtDateDisplay(dates.from)} → {fmtDateDisplay(dates.to)}
            </p>
          </div>
        </div>
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
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <TrendingDown size={24} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Aucune dépense sur cette période</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Enregistrez vos achats, loyers, salaires et autres charges pour suivre vos dépenses.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="mt-1">
            <Plus size={16} /> Enregistrer une dépense
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(expense => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              showStore={showStore}
            />
          ))}
        </div>
      )}

      {/* ── Create modal ─────────────────────────────────── */}
      {showCreate && (
        <CreateModal
          boutiques={boutiques}
          defaultStoreId={createDefaultStoreId}
          onSuccess={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
