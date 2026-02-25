import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  lastName: string | null;
  role: string | null;
  avatarUrl: string | null;
  plan: string;
  emailVerified: boolean;
  hasPasskey?: boolean;
  twoFactorEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<{ status: 'success' | '2fa_required', tempToken?: string }>;
  signUp: (email: string, password: string, name?: string, role?: string, lastName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  setSession: (token: string, user: User) => void;
  verify2FA: (tempToken: string, token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useUser = () => {
  const { user, isLoaded } = useAuth();
  return { user, isLoaded };
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(savedToken);
        } else {
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        localStorage.removeItem('auth_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ status: 'success' | '2fa_required', tempToken?: string }> => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.status === '2fa_required') {
        return { status: '2fa_required', tempToken: data.tempToken };
      }

      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { status: 'success' };
    } finally {
      setLoading(false);
    }
  }, []);

  const verify2FA = useCallback(async (tempToken: string, code: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, token: code })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '2FA verification failed');
      }

      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string, role?: string, lastName?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, lastName })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Registration failed');
      }

      // We no longer log in automatically after signup.
      // The user must verify their email and then sign in manually.
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (token) {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } finally {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const setSession = useCallback((token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    setToken(token);
    setUser(user);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    return token;
  }, [token]);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    loading,
    isLoaded: !loading,
    isSignedIn: !!user,
    signIn,
    signUp,
    signOut,
    getToken,
    setSession,
    refreshUser,
    verify2FA,
  }), [user, loading, signIn, signUp, signOut, getToken, setSession, refreshUser, verify2FA]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
