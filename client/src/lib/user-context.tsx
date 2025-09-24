import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCognitoAuth } from "@/hooks/useCognitoAuth";
import type { User, UserBand, Band } from "@/types/api";

interface UserProfile {
  user: User;
  bands: (UserBand & { band: Band })[];
}

// Simplified: Just band context vs no context

interface UserContextType {
  // Authentication
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // User profile
  user: User | null;
  userProfile: UserProfile | null;
  
  // Current band context
  currentBandId: string | null;
  currentMembership: (UserBand & { band: Band }) | null;
  
  // Actions
  selectBand: (bandId: string) => void;
  clearBandSelection: () => void;
  logout: () => void;
  
  // Helper methods
  hasMultipleBands: boolean;
  canAccessBand: (bandId: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { session, isAuthenticated, loading: authLoading, signOut } = useCognitoAuth();
  const [currentBandId, setCurrentBandId] = useState<string | null>(null);

  // Get user profile and bands from our backend
  const { data: userProfile, isLoading: profileLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      if (!session?.tokens?.idToken) {
        throw new Error("No access token");
      }

      const response = await fetch("/api/me", {
        headers: {
          "Authorization": `Bearer ${session.tokens.idToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      return response.json();
    },
    enabled: isAuthenticated && !!session?.tokens?.idToken,
  });

  // Load selected band from localStorage on mount
  useEffect(() => {
    const savedBandId = localStorage.getItem('bndy-selected-band-id');
    if (savedBandId && userProfile?.bands?.some(b => b.bandId === savedBandId)) {
      setCurrentBandId(savedBandId);
    } else if (userProfile?.bands?.length === 1) {
      // Auto-select if only one band
      const bandId = userProfile.bands[0].bandId;
      setCurrentBandId(bandId);
      localStorage.setItem('bndy-selected-band-id', bandId);
    } else if (savedBandId && userProfile?.bands && !userProfile.bands.some(b => b.bandId === savedBandId)) {
      // Clear invalid band selection
      localStorage.removeItem('bndy-selected-band-id');
      setCurrentBandId(null);
    }
  }, [userProfile]);

  // Find current membership (null if no band context)
  const currentMembership = currentBandId
    ? userProfile?.bands.find(b => b.bandId === currentBandId) || null
    : null;

  const selectBand = (bandId: string) => {
    if (userProfile?.bands.some(b => b.bandId === bandId)) {
      setCurrentBandId(bandId);
      localStorage.setItem('bndy-selected-band-id', bandId);
    }
  };


  const clearBandSelection = () => {
    setCurrentBandId(null);
    localStorage.removeItem('bndy-selected-band-id');
  };

  const logout = async () => {
    clearBandSelection();
    localStorage.removeItem('bndy-current-user'); // Legacy cleanup
    await signOut();
  };

  const canAccessBand = (bandId: string): boolean => {
    return userProfile?.bands.some(b => b.bandId === bandId) || false;
  };

  const contextValue: UserContextType = {
    isAuthenticated,
    isLoading: authLoading || profileLoading,
    user: userProfile?.user || null,
    userProfile: userProfile || null,
    currentBandId,
    currentMembership,
    selectBand,
    clearBandSelection,
    logout,
    hasMultipleBands: (userProfile?.bands.length || 0) > 1,
    canAccessBand,
  };

  return (
    <UserContext.Provider value={contextValue}>
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

// Legacy compatibility hook - for gradual migration
export function useLegacyUser() {
  const { currentMembership } = useUser();
  
  // Convert new membership format back to legacy BandMember format
  const currentUser = currentMembership ? {
    id: currentMembership.id,
    name: currentMembership.displayName,
    role: currentMembership.role,
    icon: currentMembership.icon,
    color: currentMembership.color,
  } : null;

  return {
    currentUser,
    setCurrentUser: () => {}, // No-op for legacy compatibility
    logout: () => {}, // No-op for legacy compatibility
  };
}