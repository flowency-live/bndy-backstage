import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useUser } from "@/lib/user-context";
import { navigationItems } from "@/lib/navigation-config";
import { ChevronDown, Plus, Menu, X, User, LogOut, ChevronRight, Calendar } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
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
  isOpen: boolean;
  onClose: () => void;
}

export default function SideNav({ isOpen, onClose }: SideNavProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { session, signOut } = useSupabaseAuth();
  const { toast } = useToast();
  const { 
    clearBandSelection, 
    selectBand,
    currentBandId, 
    currentMembership, 
    userProfile 
  } = useUser();
  const [isBandDropdownOpen, setIsBandDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const handleExitBand = () => {
    clearBandSelection();
    setLocation('/dashboard');
    onClose();
  };

  const handleBandSwitch = (bandId: string) => {
    selectBand(bandId);
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


  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidenav-overlay"
        />
      )}

      {/* Side Navigation */}
      <div className={`
        fixed top-0 left-0 h-screen w-64 bg-card shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-none
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <BndyLogo className="h-8 w-auto" color="hsl(var(--primary))" holeColor="hsl(var(--background))" />
              <button 
                onClick={onClose}
                className="text-foreground hover:text-muted-foreground lg:hidden"
                data-testid="button-close-sidenav"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Band/Context Switcher */}
            <DropdownMenu open={isBandDropdownOpen} onOpenChange={setIsBandDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between bg-muted hover:bg-muted/80 text-foreground border-border p-2"
                  data-testid="button-context-switcher"
                >
                  <div className="flex items-center gap-2">
                    {currentMembership ? (
                      <>
                        {currentMembership.band.avatarUrl ? (
                          <img
                            src={currentMembership.band.avatarUrl}
                            alt={`${currentMembership.band.name} avatar`}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            data-testid="band-avatar-image"
                          />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: currentMembership.color }}
                          >
                            <i className={`fas ${currentMembership.icon} text-white text-sm`}></i>
                          </div>
                        )}
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-medium text-sm truncate text-foreground">{currentMembership.band.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{currentMembership.displayName}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-medium text-sm truncate text-foreground">No Band Selected</div>
                          <div className="text-xs text-muted-foreground truncate">Personal calendar only</div>
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-60" align="start">
                  {/* Active Band */}
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground bg-muted">
                    Active Band
                  </div>
                  <DropdownMenuItem disabled className="py-3">
                    <div className="flex items-center gap-3 w-full">
                      {currentMembership ? (
                        <>
                          {currentMembership.band.avatarUrl ? (
                            <img
                              src={currentMembership.band.avatarUrl}
                              alt={`${currentMembership.band.name} avatar`}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              data-testid="band-avatar-image-dropdown"
                            />
                          ) : (
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: currentMembership.color }}
                            >
                              <i className={`fas ${currentMembership.icon} text-white text-sm`}></i>
                            </div>
                          )}
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{currentMembership.band.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {currentMembership.displayName} • {currentMembership.role}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">No Band Selected</div>
                            <div className="text-xs text-muted-foreground truncate">Personal calendar only</div>
                          </div>
                        </>
                      )}
                    </div>
                  </DropdownMenuItem>


                  {/* Band Options */}
                  {userProfile?.bands && userProfile.bands.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground bg-muted">
                        {currentBandId ? 'Other Bands' : 'Select Band'}
                      </div>
                      {userProfile.bands
                        .filter(band => band.bandId !== currentBandId)
                        .map((band) => (
                          <DropdownMenuItem
                            key={band.bandId}
                            onClick={() => handleBandSwitch(band.bandId)}
                            className="py-3 cursor-pointer"
                            data-testid={`button-switch-to-band-${band.bandId}`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              {band.band.avatarUrl ? (
                                <img
                                  src={band.band.avatarUrl}
                                  alt={`${band.band.name} avatar`}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  data-testid={`band-avatar-image-${band.bandId}`}
                                />
                              ) : (
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: band.color }}
                                >
                                  <i className={`fas ${band.icon} text-white text-sm`}></i>
                                </div>
                              )}
                              <div className="text-left min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{band.band.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
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
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = location.startsWith(item.href);
                const IconComponent = item.icon;
                const isComingSoon = item.href === '/songs';
                
                const handleClick = () => {
                  if (isComingSoon) {
                    toast({
                      title: "Coming Soon!",
                      description: "Song Lists features are being finalized for launch",
                      duration: 3000,
                    });
                  } else {
                    navigateTo(item.href);
                  }
                };
                
                return (
                  <button
                    key={item.href}
                    onClick={handleClick}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'hover:bg-muted text-foreground'
                      }
                      ${isComingSoon ? 'opacity-75' : ''}
                    `}
                    data-testid={`nav-${item.href.slice(1)}`}
                  >
                    <div 
                      className={`
                        w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                        ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                      `}
                      style={!isActive ? { backgroundColor: `${item.color}20` } : {}}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium flex items-center gap-2">
                        {item.label}
                        {isComingSoon && (
                          <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                            Soon
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-border space-y-3">
            {/* Theme Toggle */}
            <div className="flex justify-center">
              <ThemeToggle 
                variant="ghost" 
                size="sm" 
                className="text-foreground hover:bg-muted"
              />
            </div>

            {/* User Profile Dropdown */}
            {userProfile && (
              <DropdownMenu open={isUserDropdownOpen} onOpenChange={setIsUserDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="w-full flex items-center gap-2 text-foreground p-2 rounded-lg hover:bg-muted transition-colors"
                    data-testid="button-user-menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium truncate">
                        {userProfile.user.displayName || userProfile.user.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {userProfile.user.email}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-56" align="start" side="top">
                  <DropdownMenuItem 
                    onClick={() => navigateTo('/profile')} 
                    className="cursor-pointer"
                    data-testid="button-view-profile"
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  
                  {currentMembership && (
                    <DropdownMenuItem 
                      onClick={handleExitBand} 
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                      data-testid="button-exit-band"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Exit Band
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={handleSignOut} 
                    className="cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
      className={`p-3 text-foreground hover:text-muted-foreground transition-colors lg:hidden ${className}`}
      data-testid="button-burger-menu"
      aria-label="Open navigation menu"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}