import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';

export interface ComboboxItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  /** Fonction de recherche appelée à chaque frappe (debounced 300ms) et à l'ouverture. */
  search: (q: string) => Promise<ComboboxItem[]>;
  selected: ComboboxItem | null;
  onSelect: (item: ComboboxItem | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Action supplémentaire affichée en bas de la liste (ex. "+ Nouveau client"). */
  extra?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (currentQuery: string) => void;
  };
  className?: string;
}

export default function Combobox({
  search,
  selected,
  onSelect,
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Rechercher…',
  disabled = false,
  extra,
  className = '',
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ComboboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (q: string, immediate = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const doSearch = async () => {
      setLoading(true);
      try {
        const results = await search(q);
        setItems(results);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    if (immediate) {
      await doSearch();
    } else {
      debounceRef.current = setTimeout(doSearch, 300);
    }
  }, [search]);

  // ── Open ──────────────────────────────────────────────────────────────────

  const openDropdown = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Determine if there's enough room below; open upward if not
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = 320;
    const openUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    setDropdownStyle({
      position: 'fixed',
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
    setOpen(true);
  };

  // Load initial results when dropdown opens
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setItems([]);
    runSearch('', true);
    setTimeout(() => searchRef.current?.focus(), 10);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close handlers ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      const inTrigger = containerRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleQueryChange = (q: string) => {
    setQuery(q);
    runSearch(q);
  };

  const handleSelect = (item: ComboboxItem) => {
    onSelect(item);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  const toggleOpen = () => {
    if (open) setOpen(false);
    else openDropdown();
  };

  // ── Dropdown (portail) ────────────────────────────────────────────────────

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      role="listbox"
      className="bg-surface border border-line rounded-xl shadow-xl overflow-hidden"
    >
      {/* Champ de recherche */}
      <div className="relative border-b border-line">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-8 pr-3 h-12 text-sm text-ink placeholder:text-muted bg-transparent focus:outline-none"
        />
      </div>

      {/* Liste */}
      <div className="max-h-60 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">
            {query ? 'Aucun résultat' : 'Aucune entrée'}
          </p>
        ) : (
          items.map(item => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === selected?.id}
              onClick={() => handleSelect(item)}
              className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2.5 text-left hover:bg-canvas transition-colors border-b border-line last:border-0"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-ink truncate">{item.label}</span>
                {item.sublabel && (
                  <span className="block text-xs text-muted">{item.sublabel}</span>
                )}
              </span>
              {item.id === selected?.id && (
                <Check size={15} className="shrink-0 text-brand-500" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Action extra (ex. "+ Nouveau client") */}
      {extra && (
        <button
          type="button"
          onClick={() => { extra.onClick(query); setOpen(false); }}
          className="w-full min-h-[48px] flex items-center gap-2 px-4 py-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 transition-colors border-t border-line"
        >
          {extra.icon}
          {extra.label}
        </button>
      )}
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Bouton déclencheur */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'w-full min-h-[48px] flex items-center gap-2 px-3 rounded-control border bg-surface text-sm transition-colors text-left',
          open ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-line hover:border-muted',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {selected ? (
          <>
            <span className="flex-1 font-medium text-ink truncate">{selected.label}</span>
            {selected.sublabel && (
              <span className="text-xs text-muted shrink-0 hidden sm:block">{selected.sublabel}</span>
            )}
            <span
              role="button"
              aria-label="Retirer"
              onClick={handleClear}
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-ink hover:bg-canvas transition-colors -mr-1"
            >
              <X size={14} />
            </span>
          </>
        ) : (
          <>
            <span className="flex-1 text-muted">{placeholder}</span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {/* Dropdown via portail — ne déborde jamais hors de l'écran */}
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}
