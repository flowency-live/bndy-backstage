import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import BndyLogo from "@/components/ui/bndy-logo";
import type { UserBand, Band } from "@/types/api";

interface UserProfile {
  user: {
    id: string;
    supabaseId: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    hometown: string | null;
    instrument: string | null;
    avatarUrl: string | null;
    platformAdmin: boolean;
    profileCompleted: boolean;
    createdAt: string;
    updatedAt: string;
  };
  bands: (UserBand & { band: Band })[];
}

interface MemberGateProps {
  children: ({ contextId, membership, userProfile }: {
    contextId: string | null,  // Was bandId - now generic for any entity
    membership: (UserBand & { band: Band }) | null,  // Will evolve to support venues etc
    userProfile: UserProfile | null
  }) => React.ReactNode;
  allowNoContextForDashboard?: boolean;  // Was allowNoBandForDashboard
}

export default function MemberGate({ children, allowNoContextForDashboard = false }: MemberGateProps) {
  const [, setLocation] = useLocation();
  const { user, bands, loading: authLoading, isAuthenticated, session } = useServerAuth();
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Debug current auth state
  console.log('🔧 MEMBER GATE: Current state:', {
    authLoading,
    isAuthenticated,
    hasUser: !!user,
    hasSession: !!session,
    bandsCount: bands?.length || 0,
    allowNoContextForDashboard,
    selectedContextId,
    isRedirecting
  });

  // Server auth already provides user and bands data
  const userProfile: UserProfile | null = user ? {
    user: {
      id: user.id,
      supabaseId: user.cognitoId, // For compatibility
      email: user.email,
      phone: null,
      firstName: null,
      lastName: null,
      displayName: user.username,
      hometown: null,
      instrument: null,
      avatarUrl: null,
      platformAdmin: false,
      profileCompleted: true,
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
    },
    bands: bands.map(band => ({
      id: band.id,
      userId: user?.id || '',
      bandId: band.id,
      role: band.role,
      status: band.status as 'active' | 'inactive' | 'pending',
      joinedAt: new Date().toISOString(),
      permissions: [],
      band: {
        id: band.id,
        name: band.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileImage: null,
        bio: null,
        hometown: null,
        socials: {},
        genres: [],
        spotifyArtistId: null,
        appleMusicArtistId: null,
      }
    }))
  } : null;

  // Check localStorage for selected band on mount
  useEffect(() => {
    const savedContextId = localStorage.getItem('bndy-selected-context-id');
    if (savedContextId && userProfile?.bands?.some(b => b.bandId === savedContextId)) {
      setSelectedContextId(savedContextId);
    }
  }, [userProfile]);

  // Auto-select single band
  useEffect(() => {
    if (userProfile?.bands?.length === 1 && !selectedContextId) {
      const contextId = userProfile.bands[0].bandId;
      setSelectedContextId(contextId);
      localStorage.setItem('bndy-selected-context-id', contextId);
    }
  }, [userProfile, selectedContextId]);

  // Handle authentication redirects
  useEffect(() => {
    console.log('🔧 MEMBER GATE: Authentication redirect check triggered');
    console.log('🔧 MEMBER GATE: Auth state details:', {
      authLoading,
      profileLoading: false,
      isAuthenticated,
      hasSession: !!session,
      hasUser: !!user,
      isRedirecting
    });

    // Only redirect if we're absolutely sure the user is not authenticated
    if (!authLoading && !isAuthenticated) {
      console.log('🔧 MEMBER GATE: ❌ REDIRECTING TO LOGIN - User not authenticated');
      console.log('🔧 MEMBER GATE: Redirect reason: authLoading=false, isAuthenticated=false');
      setIsRedirecting(true);
      setLocation('/login');
    } else {
      console.log('🔧 MEMBER GATE: ✅ Not redirecting to login');
      console.log('🔧 MEMBER GATE: Stay reason:', {
        authLoading: authLoading ? 'still loading' : 'done',
        profileLoading: 'done',
        isAuthenticated: isAuthenticated ? 'authenticated' : 'not authenticated'
      });
    }
  }, [authLoading, isAuthenticated, setLocation, session, user, isRedirecting]);

  // Handle profile completion redirect
  useEffect(() => {
    if (userProfile && userProfile.user && !userProfile.user.profileCompleted) {
      setIsRedirecting(true);
      setLocation('/profile');
    }
  }, [userProfile, setLocation]);

  // No longer redirect to onboarding for users with no bands
  // They should be able to access dashboard without an active band

  // Handle band selection reset
  useEffect(() => {
    if (selectedContextId && userProfile && !userProfile.bands.find(b => b.bandId === selectedContextId)) {
      setSelectedContextId(null);
      localStorage.removeItem('bndy-selected-context-id');
    }
  }, [selectedContextId, userProfile]);

  const handleContextSelect = (contextId: string) => {
    setSelectedContextId(contextId);
    localStorage.setItem('bndy-selected-context-id', contextId);
  };

  const handleLogout = async () => {
    // Clear localStorage
    localStorage.removeItem('bndy-selected-context-id');
    localStorage.removeItem('bndy-current-user');
    
    // Redirect to login
    setLocation('/login');
  };

  // Show loading state
  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary-light p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-foreground mx-auto mb-4"></div>
          <p className="text-primary-foreground font-sans">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - will be handled by useEffect
  if (!isAuthenticated) {
    return null;
  }

  // Error fetching profile - could be missing profile, redirect to profile creation
  if (error) {
    // If it's a 404 or user not found, redirect to profile creation
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      setIsRedirecting(true);
      setLocation('/profile');
      return null;
    }

    // For other errors, show error screen
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary-light p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4" data-testid="logo-container">
            <div className="w-32 h-32 flex items-center justify-center mx-auto mb-4">
              <BndyLogo
                className="w-24 h-24"
                color="white"
                holeColor="rgb(51 65 85)"
              />
            </div>
          </div>
          <h2 className="text-2xl font-serif text-primary-foreground mb-4">Something went wrong</h2>
          <p className="text-primary-foreground/80 mb-6">Failed to load your profile. Please try again.</p>
          <button
            onClick={handleLogout}
            className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground px-6 py-2 rounded-lg transition-colors"
            data-testid="button-logout"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Users with no bands can access dashboard without active band context
  // Remove this blocking check

  // Multiple bands but none selected - show band selector unless dashboard allows no band
  if (userProfile && userProfile.bands.length > 1 && !selectedContextId && !allowNoContextForDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary-light p-4 flex items-center justify-center">
        <div className="text-center max-w-md w-full">
          <div className="mb-8" data-testid="logo-container">
            <div className="w-48 h-48 flex items-center justify-center mx-auto">
              <BndyLogo 
                className="w-32 h-32"
                color="white"
                holeColor="rgb(51 65 85)" 
              />
            </div>
          </div>
          
          <h2 className="text-2xl font-serif text-white mb-6">Select Your Band</h2>
          
          <div className="space-y-3 mb-6">
            {userProfile.bands.map((membership) => (
              <button
                key={membership.bandId}
                onClick={() => handleContextSelect(membership.bandId)}
                className="w-full bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                data-testid={`button-select-context-${membership.bandId}`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: membership.color }}
                  >
                    <i className={`fas ${membership.icon} text-white text-lg`}></i>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="text-lg font-sans font-semibold text-brand-primary leading-tight">{membership.band.name}</h3>
                    <p className="text-sm text-gray-600 leading-tight">{membership.displayName} • {membership.role}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setLocation('/onboarding')}
              className="text-white hover:text-white/80 font-sans underline text-sm bg-white/20 px-4 py-2 rounded"
              data-testid="button-create-new-band"
            >
              Create New Band
            </button>
            <button 
              onClick={handleLogout}
              className="text-white/70 hover:text-white/50 font-sans text-sm"
              data-testid="button-logout"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Find the selected band membership
  const selectedMembership = selectedContextId
    ? userProfile?.bands.find(b => b.bandId === selectedContextId) || null
    : null;
  
  // If no context selected but we have a selectedContextId, handle the error
  if (selectedContextId && !selectedMembership) {
    // Band not found, will be handled by useEffect
    return null;
  }

  // Render children with band context (could be null for dashboard)
  return (
    <>
      {children({ 
        contextId: selectedContextId, 
        membership: selectedMembership, 
        userProfile: userProfile || null 
      })}
    </>
  );
}