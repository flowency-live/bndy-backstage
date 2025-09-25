import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  cognitoId: string;
  username: string;
  email: string;
  createdAt: string;
}

interface Band {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface AuthSession {
  user: User;
  bands: Band[];
  session: {
    issuedAt: number;
    expiresAt: number;
  };
}

interface AuthContextType {
  user: User | null;
  bands: Band[];
  loading: boolean;
  isAuthenticated: boolean;
  session: AuthSession | null;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ServerAuthProviderProps {
  children: ReactNode;
}

export function ServerAuthProvider({ children }: ServerAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [bands, setBands] = useState<Band[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      console.log('🔧 SERVER AUTH: Checking authentication status');
      setLoading(true);

      const response = await fetch('/api/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔧 SERVER AUTH: API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔧 SERVER AUTH: Authentication successful', {
          userId: data.user?.id,
          username: data.user?.username,
          bandsCount: data.bands?.length || 0
        });

        setUser(data.user);
        setBands(data.bands || []);
        setSession(data);
      } else {
        console.log('🔧 SERVER AUTH: Not authenticated');
        setUser(null);
        setBands([]);
        setSession(null);
      }
    } catch (error) {
      console.error('🔧 SERVER AUTH: Auth check failed:', error);
      setUser(null);
      setBands([]);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🔧 SERVER AUTH: Signing out');

      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
      setBands([]);
      setSession(null);

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('🔧 SERVER AUTH: Logout failed:', error);
      // Force redirect even if logout request failed
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const isAuthenticated = !!user && !!session;

  const value = {
    user,
    bands,
    loading,
    isAuthenticated,
    session,
    signOut,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useServerAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useServerAuth must be used within a ServerAuthProvider');
  }
  return context;
}