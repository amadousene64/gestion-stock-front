import { useEffect, useRef, useState } from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';

export interface SecondaryAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface PageActionsProps {
  /** Primary CTA — always visible on both mobile and desktop. */
  primary?: React.ReactNode;
  /** Secondary actions — inline on desktop, collapsed into ⋯ on mobile. */
  secondary?: SecondaryAction[];
  className?: string;
}

export default function PageActions({ primary, secondary, className = '' }: PageActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasSecondary = secondary && secondary.length > 0;

  return (
    <div className={`w-full sm:w-auto ${className}`}>

      {/* ── MOBILE (< sm): [Primary] ··· [⋯ ml-auto]
           Primary stays visible on the left; ⋯ is pushed to the right edge so
           its dropdown (right-0) never overflows the screen.            ─────── */}
      <div className="flex items-center gap-2 w-full sm:hidden">

        {primary && <div className="shrink-0">{primary}</div>}

        {hasSecondary && (
          <div className="relative ml-auto" ref={ref}>
            <button
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="Plus d'actions"
              className="inline-flex items-center justify-center min-h-[48px] w-12
                         rounded-control border border-line bg-surface text-muted
                         hover:text-ink hover:border-ink transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px]
                           bg-surface border border-line rounded-xl shadow-lg overflow-hidden"
              >
                {secondary!.map((action, i) => (
                  <button
                    key={i}
                    role="menuitem"
                    onClick={() => { action.onClick(); setOpen(false); }}
                    disabled={action.disabled || action.loading}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                               text-sm font-medium text-ink
                               hover:bg-canvas transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed
                               border-b border-line last:border-0"
                  >
                    <span className="text-muted shrink-0 w-4 flex items-center">
                      {action.loading
                        ? <Loader2 size={16} className="animate-spin" />
                        : action.icon}
                    </span>
                    {action.loading ? 'En cours…' : action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DESKTOP (sm+): [secondary buttons inline] [Primary]  ─────────────── */}
      <div className="hidden sm:flex items-center gap-2">
        {hasSecondary && secondary!.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className="inline-flex items-center gap-1.5 min-h-[48px] px-3 text-sm font-semibold
                       rounded-control border border-line bg-surface text-muted
                       hover:text-ink hover:border-ink transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action.loading
              ? <Loader2 size={14} className="animate-spin" />
              : action.icon}
            {action.loading ? 'En cours…' : action.label}
          </button>
        ))}
        {primary}
      </div>

    </div>
  );
}
