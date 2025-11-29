import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { authService } from "@/lib/services/auth-service";
import BndyLogo from "@/components/ui/bndy-logo";

export default function Launch() {
  const [, setLocation] = useLocation();
  const attemptedWarmup = useRef(false);

  useEffect(() => {
    if (attemptedWarmup.current) return;
    attemptedWarmup.current = true;

    async function warmupSession() {
      try {
        // Check for pending invite FIRST (critical for PWA users following invite links)
        const pendingInvite = localStorage.getItem('pendingInvite');
        if (pendingInvite) {
          // Preserve invite flow - redirect to invite page instead of dashboard
          setLocation(`/invite/${pendingInvite}`);
          return;
        }

        // First attempt: try to authenticate with cookie
        let response = await authService.checkAuth();

        if (!response) {
          // Cookie not sent on first request - wait and retry
          await new Promise(resolve => setTimeout(resolve, 400));
          response = await authService.checkAuth();
        }

        if (response) {
          // Authentication successful - redirect to dashboard
          setLocation('/dashboard');
        } else {
          // Both attempts failed - redirect to login
          setLocation('/login');
        }
      } catch (error) {
        // Error during warmup - redirect to login
        setLocation('/login');
      }
    }

    warmupSession();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-32 h-32 flex items-center justify-center mx-auto">
            <BndyLogo
              className="w-24 h-24 animate-pulse"
              holeColor="rgb(51 65 85)"
            />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg max-w-sm mx-auto">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    </div>
  );
}
