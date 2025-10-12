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
    console.log('🔧 SERVER AUTH: Sign out initiated');

    // Clear client-side state immediately
    setUser(null);
    setBands([]);
    setSession(null);

    try {
      console.log('🔧 SERVER AUTH: Calling logout API');

      // Call logout API with explicit timeout
      await Promise.race([
        authService.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Logout timeout')), 5000)
        )
      ]);

      console.log('🔧 SERVER AUTH: Logout API completed successfully');
    } catch (error) {
      console.error('🔧 SERVER AUTH: Logout API failed:', error);
      // Continue to redirect even if API call failed
    }

    // Always redirect to login after attempting logout
    console.log('🔧 SERVER AUTH: Redirecting to login');
    window.location.href = '/login';
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