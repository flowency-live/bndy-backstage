import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import type { User, ArtistMembership } from "@/types/api";

interface UserProfile {
  user: User;
  artists: ArtistMembership[];
}

// Simplified: Just artist context vs no context

interface UserContextType {
  // Authentication
  isAuthenticated: boolean;
  isLoading: boolean;

  // User profile
  user: User | null;
  userProfile: UserProfile | null;

  // Current artist context
  currentArtistId: string | null;
  currentMembership: ArtistMembership | null;

  // Actions
  selectArtist: (artistId: string) => void;
  clearArtistSelection: () => void;
  logout: () => void;

  // Helper methods
  hasMultipleArtists: boolean;
  canAccessArtist: (artistId: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { session, isAuthenticated, loading: authLoading, signOut } = useServerAuth();
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);

  // Layer 2: Get user profile
  const { data: userProfileData, isLoading: profileLoading } = useQuery<User>({
    queryKey: ["users-profile"],
    queryFn: async () => {
      const response = await fetch("https://api.bndy.co.uk/users/profile", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();
      return data.user; // Extract user from { user: {...} } response
    },
    enabled: isAuthenticated,
  });

  // Layer 3: Get artist memberships
  const { data: membershipsData, isLoading: membershipsLoading } = useQuery<{ user: { id: string }, artists: ArtistMembership[] }>({
    queryKey: ["api-memberships-me"],
    queryFn: async () => {
      const response = await fetch("https://api.bndy.co.uk/api/memberships/me", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch memberships");
      }

      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Combine user profile and memberships
  const userProfile: UserProfile | null = (userProfileData && membershipsData) ? {
    user: userProfileData,
    artists: membershipsData.artists || []
  } : null;

  // Load selected artist from localStorage on mount
  useEffect(() => {
    // Check both new and legacy keys for backward compatibility
    const savedArtistId = localStorage.getItem('bndy-selected-artist-id') || localStorage.getItem('bndy-selected-context-id') || localStorage.getItem('bndy-selected-band-id');

    if (savedArtistId && userProfile?.artists?.some(a => a.artist_id === savedArtistId)) {
      setCurrentArtistId(savedArtistId);
      // Migrate to new key
      localStorage.setItem('bndy-selected-artist-id', savedArtistId);
      localStorage.removeItem('bndy-selected-band-id');
      localStorage.removeItem('bndy-selected-context-id');
    } else if (userProfile?.artists?.length === 1) {
      // Auto-select if only one artist
      const artistId = userProfile.artists[0].artist_id;
      setCurrentArtistId(artistId);
      localStorage.setItem('bndy-selected-artist-id', artistId);
    } else if (savedArtistId && userProfile?.artists && !userProfile.artists.some(a => a.artist_id === savedArtistId)) {
      // Clear invalid artist selection
      localStorage.removeItem('bndy-selected-artist-id');
      localStorage.removeItem('bndy-selected-band-id');
      localStorage.removeItem('bndy-selected-context-id');
      setCurrentArtistId(null);
    }
  }, [userProfile]);

  // Find current membership (null if no artist context)
  const currentMembership = currentArtistId
    ? userProfile?.artists.find(a => a.artist_id === currentArtistId) || null
    : null;

  const selectArtist = (artistId: string) => {
    if (userProfile?.artists.some(a => a.artist_id === artistId)) {
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

  const canAccessArtist = (artistId: string): boolean => {
    return userProfile?.artists.some(a => a.artist_id === artistId) || false;
  };

  const contextValue: UserContextType = {
    isAuthenticated,
    isLoading: authLoading || profileLoading || membershipsLoading,
    user: userProfile?.user || null,
    userProfile: userProfile || null,
    currentArtistId,
    currentMembership,
    selectArtist,
    clearArtistSelection,
    logout,
    hasMultipleArtists: (userProfile?.artists.length || 0) > 1,
    canAccessArtist,
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