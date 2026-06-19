import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { boutiquesApi } from '../services/boutiquesApi';
import { useAuth } from './AuthContext';
import { isSuperAdmin } from '../types/auth';
import type { Boutique } from '../types/boutique';

interface BoutiqueContextValue {
  boutiques: Boutique[];
  activeBoutiqueId: string | null;   // null = "Toutes les boutiques" (owner only)
  activeBoutique: Boutique | null;
  isAllBoutiques: boolean;
  isOwner: boolean;
  setActiveBoutiqueId: (id: string | null) => void;
  loading: boolean;
  reload: () => void;
}

const BoutiqueContext = createContext<BoutiqueContextValue | null>(null);

const STORAGE_KEY = 'activeBoutiqueId';

export function BoutiqueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeBoutiqueId, setActive] = useState<string | null>(() => {
    if (!isOwner) return null;
    return localStorage.getItem(STORAGE_KEY) ?? null;
  });

  const load = useCallback(() => {
    if (!user || isSuperAdmin(user)) return;
    setLoading(true);
    boutiquesApi
      .list()
      .then(data => {
        setBoutiques(data);
        if (data.length === 1) {
          // Une seule boutique : sélection automatique, quel que soit le rôle
          setActive(data[0].id);
          if (isOwner) localStorage.setItem(STORAGE_KEY, data[0].id);
        } else if (!isOwner && data.length > 0) {
          // Employé multi-boutiques : épinglé sur la première (non modifiable)
          setActive(data[0].id);
        }
        // Propriétaire multi-boutiques : conserver la valeur stockée
      })
      .catch(() => setBoutiques([]))
      .finally(() => setLoading(false));
  }, [user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const setActiveBoutiqueId = (id: string | null) => {
    if (!isOwner) return; // employees cannot switch
    setActive(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const activeBoutique = boutiques.find(b => b.id === activeBoutiqueId) ?? null;

  return (
    <BoutiqueContext.Provider value={{
      boutiques,
      activeBoutiqueId,
      activeBoutique,
      isAllBoutiques: activeBoutiqueId === null,
      isOwner,
      setActiveBoutiqueId,
      loading,
      reload: load,
    }}>
      {children}
    </BoutiqueContext.Provider>
  );
}

export function useBoutique(): BoutiqueContextValue {
  const ctx = useContext(BoutiqueContext);
  if (!ctx) throw new Error('useBoutique doit être utilisé dans BoutiqueProvider');
  return ctx;
}
