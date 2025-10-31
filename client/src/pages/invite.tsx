import { useParams, useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/services/auth-service";
import BndyLogo from "@/components/ui/bndy-logo";
import { queryClient } from "@/lib/queryClient";

interface InviteDetails {
  token: string;
  artistId: string;
  inviteType: string;
  status: string;
  expiresAt: number;
  createdAt: string;
  metadata: {
    artistName: string;
    inviterName?: string;
  };
}

export default function Invite() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);
  const hasAttemptedProfileRedirect = useRef(false);
  const hasAttemptedAutoAccept = useRef(false);

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

  // Auto-redirect authenticated users to dashboard (invite handled silently by user-context)
  useEffect(() => {
    const shouldRedirectToDashboard =
      token &&
      isAuthenticated &&
      !accepting &&
      !loadingInvite &&
      !loadingAuth &&
      inviteDetails &&
      localStorage.getItem('pendingInvite') === token &&
      !hasAttemptedProfileRedirect.current;

    if (shouldRedirectToDashboard) {
      console.log('🎫 INVITE: Authenticated user, redirecting to dashboard (invite will be handled silently)');
      hasAttemptedProfileRedirect.current = true;
      setLocation('/dashboard');
    }
  }, [token, isAuthenticated, accepting, loadingInvite, loadingAuth, inviteDetails]);

  const handleAcceptInvite = async () => {
    if (!isAuthenticated) {
      // Not logged in - redirect to login (token already in localStorage)
      console.log('🎫 INVITE: Not authenticated, redirecting to login');
      setLocation("/login");
      return;
    }

    if (!profileComplete) {
      // Profile incomplete - automatically redirect to profile (no button click needed)
      console.log('🎫 INVITE: Profile incomplete, auto-redirecting to profile');
      setLocation("/profile");
      return;
    }

    // Authenticated and profile complete - accept invite
    setAccepting(true);
    try {
      console.log('🎫 INVITE: Accepting invite:', token);
      const result = await authService.acceptInvite(token!);

      localStorage.removeItem('pendingInvite');

      // Set the new artist as the active context
      console.log('🎫 INVITE: Setting new artist as active context:', result.artist.id);
      localStorage.setItem('bndy-selected-artist-id', result.artist.id);

      // Invalidate memberships query to refresh artist context
      queryClient.invalidateQueries({ queryKey: ["api-memberships-me"] });

      toast({
        title: "Welcome to the Band!",
        description: `You've joined ${result.artist.name}! Taking you to your dashboard...`,
        variant: "default"
      });

      // Redirect to dashboard - UserProvider will load the artist context
      setLocation('/dashboard');
    } catch (error: any) {
      console.error('🎫 INVITE: Accept error:', error);

      // Check if user is already a member - treat as success
      if (error.message && error.message.includes('already a member')) {
        console.log('🎫 INVITE: User already member, clearing pendingInvite and redirecting');
        localStorage.removeItem('pendingInvite');
        setLocation('/dashboard');
        return;
      }

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
            {inviteDetails.metadata.inviterName ? `${inviteDetails.metadata.inviterName} has` : 'You\'ve been'} invited you to join
          </p>

          <p className="text-2xl font-serif text-brand-primary mb-6">
            {inviteDetails.metadata.artistName}
          </p>

          {!isAuthenticated ? (
            <p className="text-gray-600 mb-6">
              <strong>Ready to join?</strong> Sign in or create your account to accept this invitation and start collaborating with {inviteDetails.metadata.artistName}.
            </p>
          ) : !profileComplete ? (
            <p className="text-gray-600 mb-6">
              <strong>Almost there!</strong> Complete your profile to join {inviteDetails.metadata.artistName} and access your dashboard.
            </p>
          ) : (
            <p className="text-gray-600 mb-6">
              <strong>You're all set!</strong> Accept this invitation to join {inviteDetails.metadata.artistName} and access the band's calendar, setlists, and more.
            </p>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full bg-brand-accent hover:bg-brand-accent-light text-white py-3 font-semibold"
              data-testid="button-accept-invite"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining {inviteDetails.metadata.artistName}...
                </>
              ) : isAuthenticated && !profileComplete ? (
                <>
                  <i className="fas fa-user-edit mr-2"></i>
                  Complete Profile & Join
                </>
              ) : !isAuthenticated ? (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign In to Join
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle mr-2"></i>
                  Accept & Join Band
                </>
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

        <div className="mt-6 text-slate-400 text-sm space-y-2">
          {!isAuthenticated ? (
            <div>
              <p className="font-semibold mb-1">📱 New to bndy?</p>
              <p>We'll walk you through phone verification and creating your profile.</p>
            </div>
          ) : !profileComplete ? (
            <div>
              <p className="font-semibold mb-1">👤 Profile Required</p>
              <p>Add your name and details to join the band.</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold mb-1">🎸 You're One Click Away!</p>
              <p>Accept to unlock your band's calendar, setlists, and collaboration tools.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}