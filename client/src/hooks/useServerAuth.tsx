import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User, Band, AuthSession } from '../lib/services/auth-service';

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
      console.log('SERVER AUTH: Checking authentication status');
      setLoading(true);

      const authResponse = await authService.checkAuth();

      if (authResponse) {
        console.log('SERVER AUTH: Authentication successful', {
          userId: authResponse.user?.id,
          username: authResponse.user?.username
        });

        setUser(authResponse.user);
        setSession(authResponse);
        setBands([]); // No artist memberships yet - will implement later
      } else {
        console.log('SERVER AUTH: Not authenticated');
        setUser(null);
        setBands([]);
        setSession(null);
      }
    } catch (error) {
      console.error('SERVER AUTH: Auth check failed:', error);
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

      await authService.signOut();

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

  // Removed automatic checkAuth on mount - auth is checked lazily when needed by protected routes

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