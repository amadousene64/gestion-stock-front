import { Store } from 'lucide-react';
import { useBoutique } from '../contexts/BoutiqueContext';

interface Props {
  variant: 'header' | 'sidebar';
}

export default function BoutiqueSelector({ variant }: Props) {
  const { boutiques, activeBoutiqueId, setActiveBoutiqueId, loading, isOwner } = useBoutique();

  const singleBoutique = boutiques.length === 1 ? boutiques[0] : null;

  /* ── Header (mobile) ─────────────────────────────────────── */
  if (variant === 'header') {
    if (loading) {
      return <span className="text-[11px] text-muted">Chargement…</span>;
    }

    // Une seule boutique OU employé → libellé statique, pas de dropdown
    if (singleBoutique || !isOwner) {
      const name = singleBoutique?.name ?? boutiques[0]?.name ?? '—';
      return (
        <span className="flex items-center gap-1 text-[11px] text-muted truncate max-w-[180px]">
          <Store size={11} className="shrink-0 text-brand-500" />
          {name}
        </span>
      );
    }

    // Propriétaire avec plusieurs boutiques → sélecteur
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted">
        <Store size={11} className="shrink-0 text-brand-500" />
        <select
          value={activeBoutiqueId ?? ''}
          onChange={e => setActiveBoutiqueId(e.target.value || null)}
          className="bg-transparent border-none outline-none cursor-pointer text-[11px] text-muted max-w-[160px]"
          aria-label="Sélectionner une boutique"
        >
          <option value="">Toutes les boutiques</option>
          {boutiques.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </span>
    );
  }

  /* ── Sidebar (desktop) ───────────────────────────────────── */
  if (loading) {
    return <div className="px-3 py-2 text-xs text-muted">Chargement…</div>;
  }

  // Une seule boutique OU employé → libellé statique
  if (singleBoutique || !isOwner) {
    const name = singleBoutique?.name ?? boutiques[0]?.name ?? '—';
    return (
      <div className="mx-2 flex items-center gap-2 px-3 py-2 rounded-control bg-brand-50">
        <Store size={14} className="text-brand-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted leading-none mb-0.5">Boutique</p>
          <p className="text-xs font-medium text-ink truncate">{name}</p>
        </div>
      </div>
    );
  }

  // Propriétaire avec plusieurs boutiques → sélecteur
  return (
    <div className="px-3 space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-muted px-1">Boutique active</p>
      <div className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 h-9 focus-within:ring-2 focus-within:ring-brand-500">
        <Store size={14} className="text-muted shrink-0" />
        <select
          value={activeBoutiqueId ?? ''}
          onChange={e => setActiveBoutiqueId(e.target.value || null)}
          className="flex-1 min-w-0 text-sm text-ink bg-transparent border-none outline-none cursor-pointer"
          aria-label="Sélectionner une boutique"
        >
          <option value="">Toutes les boutiques</option>
          {boutiques.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
