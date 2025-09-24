import { useEffect } from "react";
import { useLocation } from "wouter";
import { cognitoAuth } from "@/lib/cognito";
import { useToast } from "@/hooks/use-toast";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('🔧 OAUTH CALLBACK: Started handling OAuth callback');
      console.log('🔧 OAUTH CALLBACK: Full URL:', window.location.href);
      console.log('🔧 OAUTH CALLBACK: Search params:', window.location.search);
      console.log('🔧 OAUTH CALLBACK: Is popup?', !!window.opener);

      // Get the authorization code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      console.log('🔧 OAUTH CALLBACK: Parsed params:', { code: code ? 'PRESENT' : 'MISSING', error, errorDescription });

      if (error) {
        console.error('🔧 OAUTH CALLBACK: OAuth error detected:', error, errorDescription);

        // If in popup, communicate via localStorage (COOP workaround)
        if (window.opener) {
          localStorage.setItem('oauth-result', JSON.stringify({
            type: 'oauth-error',
            error: errorDescription || error,
            timestamp: Date.now()
          }));
          window.close();
        } else {
          toast({
            title: "Authentication failed",
            description: errorDescription || error,
            variant: "destructive"
          });
          setLocation('/login');
        }
        return;
      }

      if (code) {
        console.log('🔧 OAUTH CALLBACK: OAuth code received:', code.substring(0, 10) + '...');

        // If in popup, communicate via localStorage (COOP workaround)
        if (window.opener) {
          console.log('🔧 OAUTH CALLBACK: Using localStorage communication due to COOP policy');
          localStorage.setItem('oauth-result', JSON.stringify({
            type: 'oauth-success',
            code: code,
            timestamp: Date.now()
          }));
          console.log('🔧 OAUTH CALLBACK: OAuth result stored in localStorage');
          window.close();
        } else {
          console.log('🔧 OAUTH CALLBACK: Not in popup, handling redirect flow');
          // Handle redirect flow (if needed in future)
          // For now, we need backend to exchange code for tokens
          toast({
            title: "Authentication in progress",
            description: "Completing sign in...",
          });

          console.log('🔧 OAUTH CALLBACK: Redirecting to /login (temporary)');
          // TODO: Call backend to exchange code for tokens
          // For now, redirect to login
          setLocation('/login');
        }
      } else {
        // No code or error
        console.error('No code or error in callback');
        if (window.opener) {
          localStorage.setItem('oauth-result', JSON.stringify({
            type: 'oauth-error',
            error: 'No authorization code received',
            timestamp: Date.now()
          }));
          window.close();
        } else {
          setLocation('/login');
        }
      }
    };

    handleCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}