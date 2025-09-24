// Replacement for useCognitoAuth - now uses AWS Cognito
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { cognitoAuth, AuthSession } from "@/lib/cognito";

interface AuthContextType {
  user: any;
  loading: boolean;
  isAuthenticated: boolean;
  session: AuthSession | null;
  signOut: () => Promise<void>;
  sendOTP: (phone: string) => Promise<any>;
  verifyOTP: (phone: string, token: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    // Check if user is already signed in
    const checkAuth = async () => {
      console.log('🔧 AUTH HOOK: Checking authentication status');
      try {
        const { data: sessionData } = await cognitoAuth.getCurrentSession();
        console.log('🔧 AUTH HOOK: Session check result:', { hasSession: !!sessionData });
        if (sessionData) {
          console.log('🔧 AUTH HOOK: Setting authenticated user');
          setUser(sessionData.user);
          setSession(sessionData);
        } else {
          console.log('🔧 AUTH HOOK: No session found');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.log('🔧 AUTH HOOK: Auth check error:', error);
        setUser(null);
        setSession(null);
      } finally {
        console.log('🔧 AUTH HOOK: Auth check complete, setting loading to false');
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signOut = async () => {
    await cognitoAuth.signOut();
    setUser(null);
    setSession(null);
  };

  const sendOTP = async (phone: string) => {
    return await cognitoAuth.sendOTP(phone);
  };

  const verifyOTP = async (phone: string, token: string) => {
    const result = await cognitoAuth.verifyOTP(phone, token);
    if (result.data) {
      setUser(result.data.user);
      setSession(result.data);
    }
    return result;
  };

  const isAuthenticated = !!user && !!session;

  const value = {
    user,
    loading,
    isAuthenticated,
    session,
    signOut,
    sendOTP,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useCognitoAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useCognitoAuth must be used within an AuthProvider");
  }
  return context;
};

// Export alias for App.tsx compatibility
export const CognitoAuthProvider = AuthProvider;

