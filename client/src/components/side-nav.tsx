import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { ChevronDown, Plus, Settings, Menu, X, Calendar, Music, Users, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import BndyLogo from "@/components/ui/bndy-logo";
import type { UserBand, Band } from "@shared/schema";

interface UserProfile {
  user: {
    id: string;
    supabaseId: string;
    email: string | null;
    phone: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  bands: (UserBand & { band: Band })[];
}

interface SideNavProps {
  currentBandId?: string;
  currentMembership?: UserBand & { band: Band };
  isOpen: boolean;
  onClose: () => void;
}

export default function SideNav({ currentBandId, currentMembership, isOpen, onClose }: SideNavProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { session, signOut } = useSupabaseAuth();
  const [isBandDropdownOpen, setIsBandDropdownOpen] = useState(false);

  // Get user profile and all bands
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch("/api/me", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      
      return response.json();
    },
    enabled: !!session?.access_token,
  });

  const handleBandSwitch = (bandId: string) => {
    localStorage.setItem('bndy-selected-band-id', bandId);
    window.location.reload(); // Force a full page reload to switch context
  };

  const handleCreateBand = () => {
    setLocation('/onboarding');
    onClose();
  };

  const handleSignOut = async () => {
    localStorage.removeItem('bndy-selected-band-id');
    localStorage.removeItem('bndy-current-user');
    await signOut();
    setLocation('/login');
    onClose();
  };

  const navigateTo = (path: string) => {
    setLocation(path);
    onClose();
  };

  const otherBands = userProfile?.bands.filter(band => band.bandId !== currentBandId) || [];

  const navigationItems = [
    { path: "/dashboard", icon: Calendar, label: "Dashboard" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/songs", icon: Music, label: "Practice List" },
    { path: "/admin", icon: Settings, label: "Manage Band" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidenav-overlay"
        />
      )}

      {/* Side Navigation */}
      <div className={`
        fixed top-0 left-0 h-screen w-80 bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-none
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-6">
              <BndyLogo className="h-8 w-auto" color="#f97316" />
              <button 
                onClick={onClose}
                className="text-white hover:text-gray-300 lg:hidden"
                data-testid="button-close-sidenav"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Band Switcher */}
            {currentMembership && (
              <DropdownMenu open={isBandDropdownOpen} onOpenChange={setIsBandDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-white/20 p-3"
                    data-testid="button-band-switcher"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: currentMembership.color }}
                      >
                        <i className={`fas ${currentMembership.icon} text-white text-sm`}></i>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-medium text-sm truncate text-white">{currentMembership.band.name}</div>
                        <div className="text-xs text-white/70 truncate">{currentMembership.displayName}</div>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-white/70" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-72" align="start">
                  {/* Current Band */}
                  <div className="px-2 py-1.5 text-sm font-medium text-gray-700 bg-gray-50">
                    Current Band
                  </div>
                  <DropdownMenuItem disabled className="py-3">
                    <div className="flex items-center gap-3 w-full">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: currentMembership.color }}
                      >
                        <i className={`fas ${currentMembership.icon} text-white text-sm`}></i>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{currentMembership.band.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {currentMembership.displayName} • {currentMembership.role}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>

                  {/* Other Bands */}
                  {otherBands.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-sm font-medium text-gray-700 bg-gray-50">
                        Switch to
                      </div>
                      {otherBands.map((band) => (
                        <DropdownMenuItem
                          key={band.bandId}
                          onClick={() => handleBandSwitch(band.bandId)}
                          className="py-3 cursor-pointer"
                          data-testid={`button-switch-to-band-${band.bandId}`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: band.color }}
                            >
                              <i className={`fas ${band.icon} text-white text-sm`}></i>
                            </div>
                            <div className="text-left min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{band.band.name}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {band.displayName} • {band.role}
                              </div>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  
                  {/* Actions */}
                  <DropdownMenuItem onClick={handleCreateBand} className="cursor-pointer" data-testid="button-create-new-band">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Band
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = location === item.path;
                const IconComponent = item.icon;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => navigateTo(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                      ${isActive 
                        ? 'bg-orange-500 text-white' 
                        : 'text-white hover:bg-white/10'
                      }
                    `}
                    data-testid={`nav-${item.path.slice(1)}`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-6 border-t border-white/10 space-y-4">
            {/* Theme Toggle */}
            <div className="flex justify-center">
              <ThemeToggle 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
              />
            </div>

            {/* User Profile & Logout */}
            {userProfile && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {userProfile.user.displayName || userProfile.user.email}
                    </div>
                    <div className="text-xs text-white/70 truncate">
                      {userProfile.user.email}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-500/20 transition-colors"
                  data-testid="button-logout"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Burger Menu Button Component
interface BurgerMenuButtonProps {
  onClick: () => void;
  className?: string;
}

export function BurgerMenuButton({ onClick, className = "" }: BurgerMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-3 text-white hover:text-white/80 transition-colors lg:hidden ${className}`}
      data-testid="button-burger-menu"
      aria-label="Open navigation menu"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}