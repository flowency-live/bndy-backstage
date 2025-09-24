import { useEffect } from "react";
import { useLocation } from "wouter";
import { cognitoAuth } from "@/lib/cognito";
import { useToast } from "@/hooks/use-toast";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the authorization code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        console.error('OAuth error:', error, errorDescription);

        // If in popup, communicate back to parent
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-error',
            error: errorDescription || error
          }, window.location.origin);
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
        console.log('OAuth code received:', code);

        // If in popup, send code to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-success',
            code: code
          }, window.location.origin);
          window.close();
        } else {
          // Handle redirect flow (if needed in future)
          // For now, we need backend to exchange code for tokens
          toast({
            title: "Authentication in progress",
            description: "Completing sign in...",
          });

          // TODO: Call backend to exchange code for tokens
          // For now, redirect to login
          setLocation('/login');
        }
      } else {
        // No code or error
        console.error('No code or error in callback');
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-error',
            error: 'No authorization code received'
          }, window.location.origin);
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