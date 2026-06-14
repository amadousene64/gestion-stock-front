import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { isTokenExpired } from '../lib/jwt';
import type { AuthUser } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { token: null, user: null };
  }
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? (JSON.parse(raw) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStoredSession();
  const [token, setToken] = useState<string | null>(stored.token);
  const [user,  setUser]  = useState<AuthUser | null>(stored.user);

  const login = (newToken: string, authUser: AuthUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    setToken(newToken);
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    localStorage.removeItem('activeBoutiqueId');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
