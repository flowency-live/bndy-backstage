import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { useServerAuth } from "@/hooks/useServerAuth";
import BndyLogo from "@/components/ui/bndy-logo";
import type { ArtistMembership, Artist } from "@/types/api";

interface UserProfile {
  user: {
    id: string;
    supabaseId?: string;
    email: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    displayName: string | null;
    hometown?: string | null;
    instrument?: string | null;
    avatarUrl: string | null;
    platformAdmin?: boolean;
    profileCompleted?: boolean;
    createdAt: string;
    updatedAt: string;
  };
  artists: ArtistMembership[];
}

interface MemberGateProps {
  children: ({ contextId, membership, userProfile }: {
    contextId: string | null,
    membership: ArtistMembership | null,
    userProfile: UserProfile | null
  }) => React.ReactNode;
  allowNoContextForDashboard?: boolean;
}

export default function MemberGate({ children, allowNoContextForDashboard = false }: MemberGateProps) {
  const [, setLocation] = useLocation();
  const { loading: authLoading, isAuthenticated, checkAuth } = useServerAuth();
  const { currentArtistId, currentMembership, userProfile: contextUserProfile, isLoading: contextLoading, logout } = useUser();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Trigger auth check when MemberGate mounts (lazy auth check)
  useEffect(() => {
    checkAuth();
  }, []);

  // Debug current auth state
  console.log('🔧 MEMBER GATE: Current state:', {
    authLoading,
    contextLoading,
    isAuthenticated,
    hasUser: !!contextUserProfile?.user,
    artistsCount: contextUserProfile?.artists?.length || 0,
    allowNoContextForDashboard,
    currentArtistId,
    isRedirecting
  });

  // Use data from user-context (already fetched and managed)
  const userProfile = contextUserProfile;

  // Handle authentication redirects
  useEffect(() => {
    console.log('🔧 MEMBER GATE: Authentication redirect check triggered');
    console.log('🔧 MEMBER GATE: Auth state details:', {
      authLoading,
      contextLoading,
      isAuthenticated,
      hasUser: !!userProfile?.user,
      isRedirecting
    });

    // Only redirect if we're absolutely sure the user is not authenticated
    if (!authLoading && !isAuthenticated) {
      console.log('🔧 MEMBER GATE: ❌ REDIRECTING TO LOGIN - User not authenticated');
      setIsRedirecting(true);
      setLocation('/login');
    } else {
      console.log('🔧 MEMBER GATE: ✅ Not redirecting to login');
      console.log('🔧 MEMBER GATE: Stay reason:', {
        authLoading: authLoading ? 'still loading' : 'done',
        contextLoading: contextLoading ? 'still loading' : 'done',
        isAuthenticated: isAuthenticated ? 'authenticated' : 'not authenticated'
      });
    }
  }, [authLoading, isAuthenticated, setLocation, isRedirecting, contextLoading, userProfile]);

  // Show loading state
  if (authLoading || contextLoading || isRedirecting) {
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

  // User-context already handles artist selection and auto-select logic
  // Just pass through the current state to children
  if (userProfile && userProfile.artists.length > 1 && !currentArtistId && !allowNoContextForDashboard) {
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
          
          <h2 className="text-2xl font-serif text-white mb-6">Select Your Artist</h2>

          <div className="space-y-3 mb-6">
            {userProfile.artists.map((membership) => (
              <button
                key={membership.artist_id}
                onClick={() => setLocation('/dashboard')}
                className="w-full bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                data-testid={`button-select-context-${membership.artist_id}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: membership.color }}
                  >
                    <i className={`fas ${membership.icon} text-white text-lg`}></i>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="text-lg font-sans font-semibold text-brand-primary leading-tight">{membership.artist?.name || membership.name}</h3>
                    <p className="text-sm text-gray-600 leading-tight">{membership.resolved_display_name} • {membership.role}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setLocation('/my-artists')}
              className="text-white hover:text-white/80 font-sans underline text-sm bg-white/20 px-4 py-2 rounded"
              data-testid="button-create-new-artist"
            >
              Create New Artist
            </button>
            <button
              onClick={logout}
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

  // Render children with artist context (could be null for dashboard)
  // user-context already handles finding the current membership
  return (
    <>
      {children({
        contextId: currentArtistId,
        membership: currentMembership,
        userProfile: userProfile || null
      })}
    </>
  );
}