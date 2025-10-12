import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/services/auth-service";
import BndyLogo from "@/components/ui/bndy-logo";

interface InviteDetails {
  token: string;
  artistId: string;
  artistName: string;
  invitedByUserId: string;
  invitedByName?: string;
  expiresAt: string;
  createdAt: string;
}

export default function Invite() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);

  // Store invite token in localStorage on mount
  useEffect(() => {
    if (token) {
      console.log('🎫 INVITE: Storing invite token in localStorage:', token);
      localStorage.setItem('pendingInvite', token);
    }
  }, [token]);

  // Fetch invite details
  const { data: inviteDetails, isLoading: loadingInvite, error: inviteError } = useQuery<InviteDetails>({
    queryKey: ['/api/invites', token],
    queryFn: async () => {
      const response = await fetch(`https://api.bndy.co.uk/api/invites/${token}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Invite not found or expired');
      }

      return response.json();
    },
    enabled: !!token,
    retry: false
  });

  // Check authentication status
  const { data: authResponse, isLoading: loadingAuth } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => authService.checkAuth(),
    retry: false
  });

  const isAuthenticated = !!authResponse?.user;
  const hasRequiredFields = authResponse?.user?.firstName &&
                           authResponse?.user?.lastName &&
                           authResponse?.user?.displayName;
  const profileComplete = authResponse?.user?.profileCompleted || hasRequiredFields;

  const handleAcceptInvite = async () => {
    if (!isAuthenticated) {
      // Not logged in - redirect to login (token already in localStorage)
      console.log('🎫 INVITE: Not authenticated, redirecting to login');
      setLocation("/login");
      return;
    }

    if (!profileComplete) {
      // Profile incomplete - MemberGate will redirect to /profile
      console.log('🎫 INVITE: Profile incomplete, redirecting to profile');
      toast({
        title: "Complete Your Profile",
        description: "Please complete your profile to accept this invitation",
        variant: "default"
      });
      setLocation("/profile");
      return;
    }

    // Authenticated and profile complete - accept invite
    setAccepting(true);
    try {
      console.log('🎫 INVITE: Accepting invite:', token);
      const result = await authService.acceptInvite(token!);

      localStorage.removeItem('pendingInvite');

      toast({
        title: "Invitation Accepted!",
        description: `You've joined ${result.artist.name}`,
        variant: "default"
      });

      // Redirect to dashboard
      setLocation('/dashboard');
    } catch (error: any) {
      console.error('🎫 INVITE: Accept error:', error);
      toast({
        title: "Failed to Accept Invitation",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    if (token) {
      localStorage.removeItem('pendingInvite');
    }
    setLocation("/");
  };

  // Loading state
  if (loadingInvite || loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (inviteError || !inviteDetails) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="mb-8" data-testid="logo-container">
            <div className="w-32 h-32 flex items-center justify-center mx-auto">
              <BndyLogo
                className="w-24 h-24"
                holeColor="rgb(51 65 85)"
              />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h1 className="text-2xl font-serif text-red-600 mb-4">
              Invitation Not Found
            </h1>

            <p className="text-gray-600 mb-6">
              This invitation may have expired or is no longer valid.
            </p>

            <Button
              onClick={() => setLocation("/")}
              className="w-full bg-brand-accent hover:bg-brand-accent-light text-white py-3"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8" data-testid="logo-container">
          <div className="w-32 h-32 flex items-center justify-center mx-auto">
            <BndyLogo
              className="w-24 h-24"
              holeColor="rgb(51 65 85)"
            />
          </div>
        </div>

        {/* Invitation Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <h1 className="text-2xl font-serif text-brand-primary mb-4">
            You've Been Invited!
          </h1>

          <p className="text-gray-600 mb-2">
            {inviteDetails.invitedByName ? `${inviteDetails.invitedByName} has` : 'You\'ve been'} invited you to join
          </p>

          <p className="text-2xl font-serif text-brand-primary mb-6">
            {inviteDetails.artistName}
          </p>

          <p className="text-gray-600 mb-6">
            Join this exclusive platform to stay organised and coordinate your music.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full bg-brand-accent hover:bg-brand-accent-light text-white py-3"
              data-testid="button-accept-invite"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Accepting...
                </>
              ) : isAuthenticated && !profileComplete ? (
                "Complete Profile to Accept"
              ) : !isAuthenticated ? (
                "Sign In to Accept"
              ) : (
                "Accept Invitation"
              )}
            </Button>

            <Button
              onClick={handleDecline}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-800"
              data-testid="button-decline-invite"
              disabled={accepting}
            >
              Not interested
            </Button>
          </div>
        </div>

        <div className="mt-6 text-slate-400 text-sm">
          <p>
            {!isAuthenticated ? "Joining requires phone verification" :
             !profileComplete ? "Complete your profile to continue" :
             "Ready to join!"}
          </p>
        </div>
      </div>
    </div>
  );
}