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
      setLoading(true);

      const authResponse = await authService.checkAuth();

      if (authResponse) {
        setUser(authResponse.user);
        setSession(authResponse);
        setBands([]); // No artist memberships yet - will implement later
      } else {
        setUser(null);
        setBands([]);
        setSession(null);
      }
    } catch (error) {
      setUser(null);
      setBands([]);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // Clear client-side state immediately
    setUser(null);
    setBands([]);
    setSession(null);

    try {
      // Call logout API with explicit timeout
      await Promise.race([
        authService.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Logout timeout')), 5000)
        )
      ]);
    } catch (error) {
      // Continue to redirect even if API call failed
    }

    // Always redirect to login after attempting logout
    window.location.href = '/login';
  };

  const isAuthenticated = !!user && !!session;

  // Automatic session check on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Periodic session refresh (every 15 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      checkAuth();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

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