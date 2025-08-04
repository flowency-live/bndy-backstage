import { useState } from "react";
import { useLocation } from "wouter";

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
        className="text-2xl font-serif text-torrist-green hover:text-torrist-green-dark transition-colors"
      >
        The Torrists
      </button>

      {/* Slide-out drawer overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeDrawer}
        />
      )}

      {/* Slide-out drawer */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-torrist-green shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isDrawerOpen ? 'translate-x-0' : '-translate-x-80'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white font-serif text-xl">Menu</h2>
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
              <span className="font-serif">Calendar</span>
            </button>
            
            <button 
              onClick={() => navigateTo("/songs")}
              className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
            >
              <i className="fas fa-music w-5"></i>
              <span className="font-serif">Practice List</span>
            </button>
            
            <button 
              onClick={() => navigateTo("/admin")}
              className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
            >
              <i className="fas fa-users-cog w-5"></i>
              <span className="font-serif">Manage Band</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}