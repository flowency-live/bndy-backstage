import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import type { User, ArtistMembership } from "@/types/api";
import { authService } from "@/lib/services/auth-service";
import { usersService } from "@/lib/services/users-service";
import { membershipsService } from "@/lib/services/memberships-service";

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

  // Platform admin / stealth mode
  isUberAdmin: boolean;
  isStealthMode: boolean;

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
  const queryClient = useQueryClient();
  const hasProcessedInvite = useRef(false);
  const [location] = useLocation();

  // Layer 2: Get user profile
  const { data: userProfileData, isLoading: profileLoading } = useQuery<User>({
    queryKey: ["users-profile"],
    queryFn: async () => {
      const data = await usersService.getProfile();
      return data.user; // Extract user from { user: {...} } response
    },
    enabled: isAuthenticated,
  });

  // Layer 3: Get artist memberships
  const { data: membershipsData, isLoading: membershipsLoading } = useQuery<{ user: { id: string }, artists: ArtistMembership[] }>({
    queryKey: ["api-memberships-me"],
    queryFn: async () => {
      return await membershipsService.getMyMemberships();
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

  // Handle pending invite silently ONLY for users with 0 memberships (new users)
  useEffect(() => {
    const processPendingInvite = async () => {
      const pendingInvite = localStorage.getItem('pendingInvite');

      if (!pendingInvite || hasProcessedInvite.current || !isAuthenticated || !userProfile) {
        return;
      }

      // Only auto-accept for users with 0 memberships (brand new users)
      // Users with existing memberships should see the confirmation page
      const membershipCount = userProfile.artists?.length || 0;
      if (membershipCount > 0) {
        return;
      }

      hasProcessedInvite.current = true;

      try {
        const result = await authService.acceptInvite(pendingInvite);

        // Clear pending invite
        localStorage.removeItem('pendingInvite');

        // Set new artist as active context
        localStorage.setItem('bndy-selected-artist-id', result.artist.id);
        setCurrentArtistId(result.artist.id);

        // Refresh memberships to include new one
        queryClient.invalidateQueries({ queryKey: ["api-memberships-me"] });
      } catch (error: any) {
        // If already a member, treat as success
        if (error.message && error.message.includes('already a member')) {
          localStorage.removeItem('pendingInvite');
        }
      }
    };

    processPendingInvite();
  }, [isAuthenticated, userProfile, queryClient]);

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

  // Platform admin flags
  const isUberAdmin = userProfile?.user?.platformAdmin || false;
  const isInGodmode = location.startsWith('/godmode');
  const isStealthMode = isUberAdmin && !isInGodmode;

  const contextValue: UserContextType = {
    isAuthenticated,
    isLoading: authLoading || profileLoading || membershipsLoading,
    user: userProfile?.user || null,
    userProfile: userProfile || null,
    currentArtistId,
    currentMembership,
    isUberAdmin,
    isStealthMode,
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