import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import BndyLogo from "@/components/ui/bndy-logo";

export default function Invite() {
  const { token } = useParams();
  const [, setLocation] = useLocation();

  const handleAcceptInvite = () => {
    // TODO: Implement invitation acceptance logic
    // For now, redirect to login
    setLocation("/login");
  };

  const handleDecline = () => {
    setLocation("/");
  };

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
          
          <p className="text-gray-600 mb-6">
            You've been invited to join a band on bndy. 
            This exclusive platform helps UK bands stay organised and coordinate their music.
          </p>

          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvite}
              className="w-full bg-brand-accent hover:bg-brand-accent-light text-white py-3"
              data-testid="button-accept-invite"
            >
              Accept Invitation
            </Button>
            
            <Button 
              onClick={handleDecline}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-800"
              data-testid="button-decline-invite"
            >
              Not interested
            </Button>
          </div>

          {token && (
            <div className="mt-4 text-xs text-gray-500 bg-gray-100 rounded p-2">
              Invitation token: {token}
            </div>
          )}
        </div>

        <div className="mt-6 text-slate-400 text-sm">
          <p>Joining requires phone verification</p>
        </div>
      </div>
    </div>
  );
}