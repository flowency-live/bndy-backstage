import { useState } from "react";
import { useLocation } from "wouter";
import BndyLogo from "@/components/ui/bndy-logo";

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
        <BndyLogo className="h-8 w-auto" />
      </button>

      {/* Only render drawer elements when open */}
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <div className="fixed top-0 left-0 h-screen w-60 bg-brand-primary shadow-2xl z-50">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-serif text-lg">Menu</h2>
                <button 
                  onClick={closeDrawer}
                  className="text-white hover:text-gray-200"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              {/* Navigation links */}
              <nav className="space-y-4">
                <button 
                  onClick={() => navigateTo("/calendar")}
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                >
                  <i className="fas fa-calendar w-5"></i>
                  <span className="font-serif text-lg">Calendar</span>
                </button>
                
                <button 
                  onClick={() => navigateTo("/songs")}
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                >
                  <i className="fas fa-music w-5"></i>
                  <span className="font-serif text-lg">Practice List</span>
                </button>
                
                <button 
                  onClick={() => navigateTo("/admin")}
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                >
                  <i className="fas fa-users-cog w-5"></i>
                  <span className="font-serif text-lg">Manage Band</span>
                </button>
                
                <button 
                  onClick={() => navigateTo("/profile")}
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  data-testid="button-profile"
                >
                  <i className="fas fa-user w-5"></i>
                  <span className="font-serif text-lg">Profile</span>
                </button>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}