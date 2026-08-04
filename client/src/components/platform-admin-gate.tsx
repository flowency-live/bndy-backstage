import { useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { useServerAuth } from "@/hooks/useServerAuth";

interface PlatformAdminGateProps {
  children: ReactNode;
}

export default function PlatformAdminGate({ children }: PlatformAdminGateProps) {
  const [, setLocation] = useLocation();
  const { loading: authLoading, isAuthenticated, checkAuth } = useServerAuth();
  const { isLoading: contextLoading, isUberAdmin } = useUser();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Trigger auth check when gate mounts
  useEffect(() => {
    checkAuth();
  }, []);

  // Handle authentication redirects
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setIsRedirecting(true);
      setLocation('/login');
    }
  }, [authLoading, isAuthenticated, setLocation]);

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

  // Not authenticated - will be handled by useEffect redirect
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated but not platform admin - show 403
  if (!isUberAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary-light p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">403</div>
          <h1 className="text-2xl font-serif text-white mb-4">Forbidden</h1>
          <p className="text-white/80 mb-6">
            You do not have permission to access this area. Platform admin access is required.
          </p>
          <button
            onClick={() => setLocation('/dashboard')}
            className="bg-white text-brand-primary px-6 py-2 rounded-lg font-sans hover:bg-white/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Platform admin - render children
  return <>{children}</>;
}
