import { useState } from "react";
import { useLocation } from "wouter";
import BndyLogo from "@/components/ui/bndy-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavigationProps {
  currentUser: any;
  onLogout: () => void;
}

export default function Navigation({ currentUser, onLogout }: NavigationProps) {
  const [, setLocation] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeDrawer = () => setIsDrawerOpen(false);

  const navigateTo = (path: string) => {
    setLocation(path);
    closeDrawer();
  };

  return (
    <>
      {/* Header with clickable logo */}
      <button 
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="font-serif text-brand-primary hover:text-brand-primary-dark transition-colors leading-tight"
      >
        <BndyLogo className="h-8 w-auto" color="#f97316" />
      </button>

      {/* Only render drawer elements when open */}
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <div className="fixed top-0 left-0 h-screen w-60 bg-primary shadow-2xl z-50 animate-slide-in-left">
            <div className="p-4 animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 animate-fade-in-up-delayed">
                <h2 className="text-primary-foreground font-serif text-lg">Menu</h2>
                <button 
                  onClick={closeDrawer}
                  className="text-primary-foreground hover:text-primary-foreground/80 hover-scale-105 transition-transform duration-200"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              {/* Navigation links */}
              <nav className="space-y-4">
                <button 
                  onClick={() => navigateTo("/calendar")}
                  className="w-full text-left py-3 px-4 rounded-lg text-primary-foreground hover:bg-white/20 transition-colors flex items-center space-x-3"
                >
                  <i className="fas fa-calendar w-5"></i>
                  <span className="font-serif text-lg">Calendar</span>
                </button>
                
                <button 
                  onClick={() => navigateTo("/songs")}
                  className="w-full text-left py-3 px-4 rounded-lg text-primary-foreground hover:bg-white/20 transition-colors flex items-center space-x-3"
                >
                  <i className="fas fa-music w-5"></i>
                  <span className="font-serif text-lg">Practice List</span>
                </button>
                
                <button 
                  onClick={() => navigateTo("/admin")}
                  className="w-full text-left py-3 px-4 rounded-lg text-primary-foreground hover:bg-white/20 transition-colors flex items-center space-x-3"
                >
                  <i className="fas fa-users-cog w-5"></i>
                  <span className="font-serif text-lg">Manage Band</span>
                </button>
                
                <button 
                  onClick={() => navigateTo("/profile")}
                  className="w-full text-left py-3 px-4 rounded-lg text-primary-foreground hover:bg-white/20 transition-colors flex items-center space-x-3"
                  data-testid="button-profile"
                >
                  <i className="fas fa-user w-5"></i>
                  <span className="font-serif text-lg">Profile</span>
                </button>
                
                <hr className="border-white/20 my-4" />
                
                {/* Theme Toggle */}
                <div className="flex items-center justify-between py-3 px-4">
                  <span className="font-serif text-lg text-primary-foreground">Theme</span>
                  <ThemeToggle 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary-foreground hover:bg-white/20"
                  />
                </div>
                
                <hr className="border-white/20 my-4" />
                
                {/* Logout Button */}
                <button 
                  onClick={onLogout}
                  className="w-full text-left py-3 px-4 rounded-lg text-red-300 hover:bg-red-500/20 transition-colors flex items-center space-x-3"
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt w-5"></i>
                  <span className="font-serif text-lg">Sign Out</span>
                </button>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}