import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { userApi } from '../services/userApi';
import type { UserProfile } from '../services/userApi';
import { useAuth } from './AuthContext';

interface UserProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  /** Mise à jour optimiste après un PUT (pas de re-fetch nécessaire). */
  updateProfile: (partial: Partial<UserProfile>) => void;
  reload: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    setLoading(true);
    userApi
      .getMe()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const updateProfile = (partial: Partial<UserProfile>) =>
    setProfile(prev => (prev ? { ...prev, ...partial } : prev));

  return (
    <UserProfileContext.Provider value={{ profile, loading, updateProfile, reload: load }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile doit être utilisé dans UserProfileProvider');
  return ctx;
}
