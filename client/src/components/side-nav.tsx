import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useUser } from "@/lib/user-context";
import { navigationItems } from "@/lib/navigation-config";
import { formatDisplayName } from "@/lib/display-name-utils";
import { ChevronDown, Plus, Menu, X, User, LogOut, ChevronRight, Calendar, Bug, Shield, Zap } from "lucide-react";
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
import IssueForm from "@/components/ui/issue-form";
import type { User, ArtistMembership } from "@/types/api";

interface UserProfile {
  user: User;
  artists: ArtistMembership[];
}

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideNav({ isOpen, onClose }: SideNavProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { session, signOut } = useServerAuth();
  const { toast } = useToast();
  const {
    clearArtistSelection,
    selectArtist,
    currentArtistId,
    currentMembership,
    userProfile
  } = useUser();
  const [isBandDropdownOpen, setIsBandDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false);

  const handleExitArtist = () => {
    clearArtistSelection();
    setLocation('/dashboard');
    onClose();
  };

  const handleArtistSwitch = (artistId: string) => {
    selectArtist(artistId);
    setLocation('/dashboard');
    setIsBandDropdownOpen(false);
    onClose();
  };

  const handleCreateArtist = () => {
    setLocation('/dashboard'); // Dashboard now has wizard
    onClose();
  };

  const handleSignOut = async () => {
    // Clear localStorage
    localStorage.removeItem('bndy-selected-artist-id');
    localStorage.removeItem('bndy-selected-band-id');
    localStorage.removeItem('bndy-current-user');

    // Close the dropdown
    onClose();

    // Call signOut (which handles redirect)
    await signOut();

    // Note: No need to call setLocation as signOut() does window.location.href redirect
  };

  const navigateTo = (path: string) => {
    setLocation(path);
    onClose();
  };

  const otherArtists = userProfile?.artists.filter(artist => artist.artist_id !== currentArtistId) || [];


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
        lg:translate-x-0 lg:static lg:shadow-none overflow-y-auto
      `}>
        <div className="flex flex-col min-h-full">
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
                        {currentMembership.artist?.profileImageUrl ? (
                          <img
                            src={currentMembership.artist.profileImageUrl}
                            alt={`${currentMembership.artist.name} avatar`}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            data-testid="artist-avatar-image"
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
                          <div className="font-medium text-sm truncate text-foreground">{currentMembership.artist?.name || currentMembership.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{formatDisplayName(currentMembership.resolved_display_name)}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-medium text-sm truncate text-foreground">No Artist Selected</div>
                          <div className="text-xs text-muted-foreground truncate">Personal calendar only</div>
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-60" align="start">
                  {/* My Artists Link */}
                  <DropdownMenuItem
                    onClick={() => {
                      setLocation('/my-artists');
                      setIsBandDropdownOpen(false);
                      onClose();
                    }}
                    className="py-3 cursor-pointer font-medium text-primary"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 flex-shrink-0">
                        <i className="fas fa-th text-primary text-sm"></i>
                      </div>
                      <span>My Artists</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Active Artist */}
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground bg-muted">
                    Active Artist
                  </div>
                  <DropdownMenuItem disabled className="py-3">
                    <div className="flex items-center gap-3 w-full">
                      {currentMembership ? (
                        <>
                          {currentMembership.artist?.profileImageUrl ? (
                            <img
                              src={currentMembership.artist.profileImageUrl}
                              alt={`${currentMembership.artist.name} avatar`}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              data-testid="artist-avatar-image-dropdown"
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
                            <div className="font-medium text-sm truncate">{currentMembership.artist?.name || currentMembership.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {currentMembership.resolved_display_name} • {currentMembership.role}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">No Artist Selected</div>
                            <div className="text-xs text-muted-foreground truncate">Personal calendar only</div>
                          </div>
                        </>
                      )}
                    </div>
                  </DropdownMenuItem>


                  {/* Artist Quick Switch Options */}
                  {userProfile?.artists && userProfile.artists.length > 0 && otherArtists.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground bg-muted">
                        Quick Switch
                      </div>
                      {userProfile.artists
                        .filter(artist => artist.artist_id !== currentArtistId)
                        .map((artist) => (
                          <DropdownMenuItem
                            key={artist.artist_id}
                            onClick={() => handleArtistSwitch(artist.artist_id)}
                            className="py-3 cursor-pointer"
                            data-testid={`button-switch-to-artist-${artist.artist_id}`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              {artist.artist.profileImageUrl ? (
                                <img
                                  src={artist.artist.profileImageUrl}
                                  alt={`${artist.artist.name} avatar`}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  data-testid={`artist-avatar-image-${artist.artist_id}`}
                                />
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: artist.color }}
                                >
                                  <i className={`fas ${artist.icon} text-white text-sm`}></i>
                                </div>
                              )}
                              <div className="text-left min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{artist.artist.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {artist.resolved_display_name} • {artist.role}
                                </div>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  
                  {/* Actions */}
                  <DropdownMenuItem onClick={handleCreateArtist} className="cursor-pointer" data-testid="button-create-new-artist">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Artist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                // Hide "Song Lists" and "Manage Band" when no artist context
                const requiresArtistContext = item.href === '/songs' || item.href === '/admin';
                if (requiresArtistContext && !currentMembership) {
                  return null;
                }

                const isActive = location.startsWith(item.href);
                const IconComponent = item.icon;

                const handleClick = () => {
                  navigateTo(item.href);
                };

                return (
                  <button
                    key={item.href}
                    onClick={handleClick}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200
                      ${isActive
                        ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                        : 'hover:bg-muted text-foreground'
                      }
                    `}
                    data-testid={`nav-${item.href.slice(1)}`}
                  >
                    <div
                      className={`
                        w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                        ${isActive ? 'bg-orange-500 text-white' : 'bg-muted'}
                      `}
                      style={!isActive ? { backgroundColor: `${item.color}20` } : {}}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium flex items-center gap-2">
                        {item.label}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-border space-y-3">
            {/* Issue Report & Theme Toggle */}
            <div className="flex justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsIssueFormOpen(true)}
                className="h-8 w-8 p-0 text-foreground hover:bg-muted"
                data-testid="button-report-issue"
                title="Report Issue"
              >
                <Bug className="h-4 w-4" />
              </Button>
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

                  <DropdownMenuItem
                    onClick={() => navigateTo('/issues')}
                    className="cursor-pointer"
                    data-testid="button-view-issues"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    View Issues
                  </DropdownMenuItem>

                  {currentMembership && (
                    <DropdownMenuItem
                      onClick={handleExitArtist}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                      data-testid="button-exit-artist"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Exit Artist
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

      {/* Issue Form Modal */}
      <IssueForm
        open={isIssueFormOpen}
        onOpenChange={setIsIssueFormOpen}
        onSuccess={() => {
          toast({
            title: "Issue Reported",
            description: "Thank you for helping improve the platform!",
          });
        }}
      />
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