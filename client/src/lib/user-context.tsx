import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
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
  
  // Current artist context
  currentArtistId: string | null;
  currentMembership: (UserBand & { band: Band }) | null;

  // Actions
  selectArtist: (artistId: string) => void;
  clearArtistSelection: () => void;
  logout: () => void;
  
  // Helper methods
  hasMultipleBands: boolean;
  canAccessBand: (bandId: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { session, isAuthenticated, loading: authLoading, signOut } = useServerAuth();
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);

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

  // Load selected artist from localStorage on mount
  useEffect(() => {
    // Check both new and legacy keys for backward compatibility
    const savedArtistId = localStorage.getItem('bndy-selected-artist-id') || localStorage.getItem('bndy-selected-context-id') || localStorage.getItem('bndy-selected-band-id');

    if (savedArtistId && userProfile?.bands?.some(b => b.bandId === savedArtistId)) {
      setCurrentArtistId(savedArtistId);
      // Migrate to new key
      localStorage.setItem('bndy-selected-artist-id', savedArtistId);
      localStorage.removeItem('bndy-selected-band-id');
      localStorage.removeItem('bndy-selected-context-id');
    } else if (userProfile?.bands?.length === 1) {
      // Auto-select if only one artist
      const artistId = userProfile.bands[0].bandId;
      setCurrentArtistId(artistId);
      localStorage.setItem('bndy-selected-artist-id', artistId);
    } else if (savedArtistId && userProfile?.bands && !userProfile.bands.some(b => b.bandId === savedArtistId)) {
      // Clear invalid artist selection
      localStorage.removeItem('bndy-selected-artist-id');
      localStorage.removeItem('bndy-selected-band-id');
      localStorage.removeItem('bndy-selected-context-id');
      setCurrentArtistId(null);
    }
  }, [userProfile]);

  // Find current membership (null if no artist context)
  const currentMembership = currentArtistId
    ? userProfile?.bands.find(b => b.bandId === currentArtistId) || null
    : null;

  const selectArtist = (artistId: string) => {
    if (userProfile?.bands.some(b => b.bandId === artistId)) {
      setCurrentArtistId(artistId);
      localStorage.setItem('bndy-selected-artist-id', artistId);
      // Clean up legacy keys
      localStorage.removeItem('bndy-selected-band-id');
      localStorage.removeItem('bndy-selected-context-id');
    }
  };

  const clearArtistSelection = () => {
    setCurrentArtistId(null);
    localStorage.removeItem('bndy-selected-artist-id');
    localStorage.removeItem('bndy-selected-band-id');
    localStorage.removeItem('bndy-selected-context-id');
  };

  const logout = async () => {
    clearArtistSelection();
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
    currentArtistId,
    currentMembership,
    selectArtist,
    clearArtistSelection,
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