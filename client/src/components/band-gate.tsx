import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import BndyLogo from "@/components/ui/bndy-logo";
import type { UserBand, Band } from "@shared/schema";

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

interface BandGateProps {
  children: ({ bandId, membership }: { bandId: string, membership: UserBand & { band: Band } }) => React.ReactNode;
}

export default function BandGate({ children }: BandGateProps) {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated, session } = useSupabaseAuth();
  const [selectedBandId, setSelectedBandId] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Get user profile and bands from our backend
  const { data: userProfile, isLoading: profileLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch("/api/me", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      
      return response.json();
    },
    enabled: isAuthenticated && !!session?.access_token,
  });

  // Check localStorage for selected band on mount
  useEffect(() => {
    const savedBandId = localStorage.getItem('bndy-selected-band-id');
    if (savedBandId && userProfile?.bands?.some(b => b.bandId === savedBandId)) {
      setSelectedBandId(savedBandId);
    }
  }, [userProfile]);

  // Auto-select single band
  useEffect(() => {
    if (userProfile?.bands?.length === 1 && !selectedBandId) {
      const bandId = userProfile.bands[0].bandId;
      setSelectedBandId(bandId);
      localStorage.setItem('bndy-selected-band-id', bandId);
    }
  }, [userProfile, selectedBandId]);

  // Handle authentication redirects
  useEffect(() => {
    if (!authLoading && !profileLoading && !isAuthenticated) {
      setIsRedirecting(true);
      setLocation('/login');
    }
  }, [authLoading, profileLoading, isAuthenticated, setLocation]);

  // Handle profile completion redirect
  useEffect(() => {
    if (userProfile && !userProfile.user.profileCompleted) {
      setIsRedirecting(true);
      setLocation('/profile');
    }
  }, [userProfile, setLocation]);

  // Handle onboarding redirect
  useEffect(() => {
    if (userProfile && userProfile.user.profileCompleted && userProfile.bands.length === 0) {
      setIsRedirecting(true);
      setLocation('/onboarding');
    }
  }, [userProfile, setLocation]);

  // Handle band selection reset
  useEffect(() => {
    if (selectedBandId && userProfile && !userProfile.bands.find(b => b.bandId === selectedBandId)) {
      setSelectedBandId(null);
      localStorage.removeItem('bndy-selected-band-id');
    }
  }, [selectedBandId, userProfile]);

  const handleBandSelect = (bandId: string) => {
    setSelectedBandId(bandId);
    localStorage.setItem('bndy-selected-band-id', bandId);
  };

  const handleLogout = async () => {
    // Clear localStorage
    localStorage.removeItem('bndy-selected-band-id');
    localStorage.removeItem('bndy-current-user');
    
    // Redirect to login
    setLocation('/login');
  };

  // Show loading state
  if (authLoading || profileLoading || isRedirecting) {
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

  // Error fetching profile - show error
  if (error) {
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

  // No bands - will be handled by useEffect
  if (userProfile && userProfile.bands.length === 0) {
    return null;
  }

  // Multiple bands but none selected - show band selector
  if (userProfile && userProfile.bands.length > 1 && !selectedBandId) {
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
                onClick={() => handleBandSelect(membership.bandId)}
                className="w-full bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                data-testid={`button-select-band-${membership.bandId}`}
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
  const selectedMembership = userProfile?.bands.find(b => b.bandId === selectedBandId);
  
  if (!selectedMembership) {
    // Band not found, will be handled by useEffect
    return null;
  }

  // Render children with selected band context
  return (
    <>
      {children({ bandId: selectedBandId!, membership: selectedMembership })}
    </>
  );
}