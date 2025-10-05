import { useState } from "react";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import BndyLogo from "@/components/ui/bndy-logo";
import IssueForm from "@/components/ui/issue-form";
import { BndySpinner } from "@/components/ui/bndy-spinner";
import { useUser } from "@/lib/user-context";
import { navigationItems } from "@/lib/navigation-config";
import { useToast } from "@/hooks/use-toast";
import {
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bug
} from "lucide-react";
import type { ArtistMembership } from "@/types/api";

interface MobileNavProps {
  currentArtistId?: string;
  currentMembership?: ArtistMembership;
  isLoading?: boolean;
}


export function MobileNavHeader({ currentMembership, isLoading }: MobileNavProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false);
  const { toast } = useToast();
  const { clearArtistSelection, userProfile, selectArtist, currentArtistId } = useUser();

  const handleExitArtist = () => {
    clearArtistSelection();
    setLocation('/dashboard');
    setIsOpen(false);
  };

  // Don't show header on auth pages
  const hideHeader = ["/", "/login", "/onboarding"].includes(location) || location.startsWith("/invite/");
  if (hideHeader) return null;

  const currentPage = navigationItems.find(item => location.startsWith(item.href));

  return (
    <>
      {/* Mobile Header - Always visible on mobile */}
      <header className="sticky top-0 z-50 lg:hidden bg-card/95 backdrop-blur-sm border-b border-border h-16">
        <div className="flex items-center justify-between h-full">
          {/* Left: Artist Avatar or Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="h-full w-16 p-0 overflow-hidden rounded-none"
                data-testid="mobile-nav-trigger"
              >
                {currentMembership ? (
                  currentMembership.artist?.profileImageUrl || currentMembership.resolved_avatar_url ? (
                    <img
                      src={currentMembership.artist?.profileImageUrl || currentMembership.resolved_avatar_url || ''}
                      alt={`${currentMembership.artist?.name || currentMembership.name} avatar`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{ backgroundColor: currentMembership.color }}
                    >
                      <i className={`fas ${currentMembership.icon} text-white text-xl`}></i>
                    </div>
                  )
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </SheetTrigger>

            {/* Mobile Navigation Sheet */}
            <SheetContent side="left" className="w-full sm:w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center mb-4">
                    <BndyLogo className="h-8 w-auto" color="hsl(var(--primary))" />
                  </div>

                  {/* Artist Info - Clickable for switching */}
                  {currentMembership && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="bg-muted rounded-lg p-3 cursor-pointer hover:bg-muted/80 transition-colors">
                          <div className="flex items-center gap-3">
                            {currentMembership.artist?.profileImageUrl || currentMembership.resolved_avatar_url ? (
                              <img
                                src={currentMembership.artist?.profileImageUrl || currentMembership.resolved_avatar_url || ''}
                                alt={`${currentMembership.artist?.name || currentMembership.name} avatar`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: currentMembership.color }}
                              >
                                <i className={`fas ${currentMembership.icon} text-white`}></i>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-foreground truncate">
                                {currentMembership.artist?.name || currentMembership.name}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {currentMembership.resolved_display_name || currentMembership.display_name} • {currentMembership.role}
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="bottom" className="w-56">
                        {/* View All Artists Link */}
                        <DropdownMenuItem
                          onClick={() => {
                            setLocation('/my-artists');
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 p-3 font-medium text-primary"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10">
                            <i className="fas fa-th text-primary text-sm"></i>
                          </div>
                          <span>My Artists</span>
                        </DropdownMenuItem>

                        {/* Separator if there are other artists */}
                        {userProfile?.artists?.filter(membership => membership.artist_id !== currentArtistId).length > 0 && (
                          <div className="h-px bg-border my-1" />
                        )}

                        {/* Other Artists Quick Switch */}
                        {userProfile?.artists
                          ?.filter(membership => membership.artist_id !== currentArtistId) // Don't show current artist
                          ?.map((membership) => (
                            <DropdownMenuItem
                              key={membership.artist_id}
                              onClick={() => {
                                localStorage.setItem('bndy-selected-artist-id', membership.artist_id);
                                window.location.reload(); // Force full page reload like desktop nav
                              }}
                              className="flex items-center gap-3 p-3"
                            >
                              {membership.artist?.profileImageUrl || membership.resolved_avatar_url ? (
                                <img
                                  src={membership.artist?.profileImageUrl || membership.resolved_avatar_url || ''}
                                  alt={`${membership.artist?.name || membership.name} avatar`}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: membership.color }}
                                >
                                  <i className={`fas ${membership.icon} text-white text-sm`}></i>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground truncate">
                                  {membership.artist?.name || membership.name}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {membership.resolved_display_name || membership.display_name} • {membership.role}
                                </div>
                              </div>
                            </DropdownMenuItem>
                          )) || []}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 p-6 space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.startsWith(item.href);
                    const isComingSoon = item.href === '/songs';
                    
                    const handleClick = () => {
                      if (isComingSoon) {
                        toast({
                          title: "Coming Soon!",
                          description: "Song Lists features are being finalized for launch",
                          duration: 3000,
                        });
                        setIsOpen(false);
                      } else {
                        setLocation(item.href);
                        setIsOpen(false);
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
                        data-testid={`nav-${item.label.toLowerCase()}`}
                      >
                        <div 
                          className={`
                            w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                            ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                          `}
                          style={!isActive ? { backgroundColor: `${item.color}20` } : {}}
                        >
                          <Icon className="h-5 w-5" />
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
                </nav>

                {/* Footer */}
                <div className="p-6 border-t border-border space-y-4">
                  {currentMembership && (
                    <Button
                      variant="ghost"
                      onClick={handleExitArtist}
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                      data-testid="button-exit-artist"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Exit Artist
                    </Button>
                  )}
                  <div className="text-center text-xs text-muted-foreground">
                    bndy • Artist Management Platform
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Center: Logo & Page Title */}
          <div className="flex items-center gap-3 flex-1 justify-center px-4">
            {isLoading ? (
              <BndySpinner size="sm" variant="grow" />
            ) : (
              <>
                <BndyLogo className="h-7 w-auto" color="hsl(var(--primary))" />
                {currentPage && (
                  <span className="font-semibold text-foreground">{currentPage.label}</span>
                )}
              </>
            )}
          </div>

          {/* Right: Issue Report, Theme Toggle & Action Badge */}
          <div className="flex items-center gap-2 pr-4">
            {/* Issue Report Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsIssueFormOpen(true)}
              className="h-8 w-8 p-0 hover:bg-accent"
              data-testid="button-report-issue"
              title="Report Issue"
            >
              <Bug className="h-4 w-4" />
            </Button>

            <ThemeToggle size="sm" />
            {currentMembership && (
              <Badge
                variant="secondary"
                className="h-6 px-2 text-xs"
                style={{ backgroundColor: `${currentMembership.color}20`, color: currentMembership.color }}
              >
                {currentMembership.role[0].toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Navigation - Alternative mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card backdrop-blur-sm border-t border-border">
        <div className="flex items-center justify-around py-2">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.href);
            
            return (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-lg min-w-0 flex-1
                  ${isActive ? 'text-primary' : 'text-muted-foreground'}
                `}
                data-testid={`bottom-nav-${item.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

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

export default MobileNavHeader;