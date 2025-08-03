import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { BandMember } from "@shared/schema";

interface UserContextType {
  currentUser: BandMember | null;
  setCurrentUser: (user: BandMember | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<BandMember | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('torrists-current-user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('torrists-current-user');
      }
    }
  }, []);

  // Save user to localStorage when it changes
  const handleSetCurrentUser = (user: BandMember | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('torrists-current-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('torrists-current-user');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('torrists-current-user');
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser: handleSetCurrentUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
