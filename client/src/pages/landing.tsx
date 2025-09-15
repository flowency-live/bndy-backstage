import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import BndyLogo from "@/components/ui/bndy-logo";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleSignIn = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary-light">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        {/* Logo */}
        <div className="mb-8" data-testid="logo-container">
          <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mx-auto">
            <BndyLogo 
              className="w-48 h-48 md:w-64 md:h-64"
              holeColor="#1e293b" 
            />
          </div>
        </div>

        {/* Strapline - Responsive Layout */}
        <div className="max-w-2xl mx-auto mb-12">
          {/* Desktop: Single line */}
          <h1 className="hidden sm:block text-4xl lg:text-6xl font-bold mb-6 leading-tight" data-testid="strapline-desktop">
            <span className="text-white">Keeping </span>
            <span className="text-cyan-400">LIVE </span>
            <span className="text-white">Music </span>
            <span className="text-orange-500">ALIVE</span>
          </h1>
          
          {/* Mobile: Two lines with perfect LIVE/ALIVE alignment */}
          <div className="block sm:hidden font-bold mb-6 text-3xl leading-tight" data-testid="strapline-mobile">
            <div className="grid grid-cols-[max-content_max-content] gap-x-3 justify-center mb-1">
              <span className="text-white">Keeping</span>
              <span className="text-cyan-400">LIVE</span>
            </div>
            <div className="grid grid-cols-[max-content_max-content] gap-x-3 justify-center">
              <span className="text-white">Music</span>
              <span className="text-orange-500">ALIVE</span>
            </div>
          </div>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
            The invite-only platform for bands who take their music seriously. 
            Coordinate practices, manage gigs, and track song progress with your bandmates.
          </p>

          <div className="space-y-4">
            <Button 
              onClick={handleSignIn}
              size="lg"
              className="bg-brand-accent hover:bg-brand-accent-light text-white px-8 py-4 text-lg font-sans rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              data-testid="button-sign-in"
            >
              Sign In to Your Band
            </Button>
            
            <p className="text-white/70 text-sm">
              Invitation required • UK bands only
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center mb-4 mx-auto">
              <i className="fas fa-calendar-alt text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-white/80 text-sm">
              Coordinate practices and gigs with conflict detection and availability tracking.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center mb-4 mx-auto">
              <i className="fas fa-music text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Song Management</h3>
            <p className="text-white/80 text-sm">
              Track song readiness with integrated Spotify search and progress monitoring.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center mb-4 mx-auto">
              <i className="fas fa-users text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Band Collaboration</h3>
            <p className="text-white/80 text-sm">
              Keep everyone in sync with member roles, availability, and practice notes.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}