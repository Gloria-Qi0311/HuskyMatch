/** App-wide auth state: the current session plus sign-in / sign-out. */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearSession, loadSession, saveSession, type Session } from '@/lib/auth';

type AuthState = {
  session: Session | null;
  loading: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession().then((stored) => {
      setSession(stored);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      signIn: async (next) => {
        await saveSession(next);
        setSession(next);
      },
      signOut: async () => {
        await clearSession();
        setSession(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
