// Replacement for useCognitoAuth - now uses AWS Cognito
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { cognitoAuth, AuthSession } from "@/lib/cognito";

interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
  sendOTP: (phone: string) => Promise<any>;
  verifyOTP: (phone: string, token: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already signed in
    const checkAuth = async () => {
      try {
        const { data: session } = await cognitoAuth.getCurrentSession();
        if (session) {
          setUser(session.user);
        }
      } catch (error) {
        console.log("No active session");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signOut = async () => {
    await cognitoAuth.signOut();
    setUser(null);
  };

  const sendOTP = async (phone: string) => {
    return await cognitoAuth.sendOTP(phone);
  };

  const verifyOTP = async (phone: string, token: string) => {
    const result = await cognitoAuth.verifyOTP(phone, token);
    if (result.data) {
      setUser(result.data.user);
    }
    return result;
  };

  const value = {
    user,
    loading,
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

// For backward compatibility, export as useCognitoAuth
export const useCognitoAuth = useCognitoAuth;
