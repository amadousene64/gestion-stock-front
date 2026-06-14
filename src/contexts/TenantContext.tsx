import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { tenantApi } from '../services/tenantApi';
import { useAuth } from './AuthContext';
import type { Tenant } from '../types/tenant';

interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
  reload: () => void;
  /** Mise à jour optimiste après un PUT/POST : pas de re-fetch nécessaire. */
  updateTenant: (partial: Partial<Tenant>) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const STORAGE_KEY = 'tenant';

function readStored(): Tenant | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tenant) : null;
  } catch {
    return null;
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [tenant,  setTenant]  = useState<Tenant | null>(readStored);
  const [loading, setLoading] = useState(false);

  const applyAndPersist = (next: Tenant) => {
    setTenant(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const load = useCallback(() => {
    if (!user) {
      setTenant(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    setLoading(true);
    tenantApi
      .getCurrent()
      .then(applyAndPersist)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const updateTenant = (partial: Partial<Tenant>) =>
    setTenant(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

  return (
    <TenantContext.Provider value={{ tenant, loading, reload: load, updateTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant doit être utilisé dans TenantProvider');
  return ctx;
}
