import { useState } from "react";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import BndyLogo from "@/components/ui/bndy-logo";
import { BndySpinner } from "@/components/ui/bndy-spinner";
import { 
  Menu, 
  Home, 
  Calendar, 
  Music, 
  Settings, 
  User,
  X,
  ChevronRight
} from "lucide-react";
import type { UserBand, Band } from "@shared/schema";

interface MobileNavProps {
  currentBandId?: string;
  currentMembership?: UserBand & { band: Band };
  isLoading?: boolean;
}

const navigationItems = [
  { 
    icon: Home, 
    label: "Dashboard", 
    href: "/dashboard", 
    color: "hsl(220, 13%, 51%)",
    description: "Overview & quick actions"
  },
  { 
    icon: Calendar, 
    label: "Calendar", 
    href: "/calendar", 
    color: "hsl(271, 91%, 65%)",
    description: "Schedule & events"
  },
  { 
    icon: Music, 
    label: "Practice List", 
    href: "/songs", 
    color: "hsl(45, 93%, 47%)",
    description: "Repertoire & setlists"
  },
  { 
    icon: Settings, 
    label: "Manage Band", 
    href: "/admin", 
    color: "hsl(220, 13%, 51%)",
    description: "Band management & settings"
  },
  { 
    icon: User, 
    label: "Profile", 
    href: "/profile", 
    color: "hsl(220, 13%, 51%)",
    description: "Personal settings"
  }
];

export function MobileNavHeader({ currentMembership, isLoading }: MobileNavProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show header on auth pages
  const hideHeader = ["/", "/login", "/onboarding"].includes(location) || location.startsWith("/invite/");
  if (hideHeader) return null;

  const currentPage = navigationItems.find(item => location.startsWith(item.href));

  return (
    <>
      {/* Mobile Header - Always visible on mobile */}
      <header className="sticky top-0 z-50 lg:hidden bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          {/* Left: Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 p-0"
                data-testid="mobile-nav-trigger"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>

            {/* Mobile Navigation Sheet */}
            <SheetContent side="left" className="w-full sm:w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <BndyLogo className="h-8 w-auto" color="hsl(var(--primary))" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Band Info */}
                  {currentMembership && (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {currentMembership.band.avatarUrl ? (
                          <img
                            src={currentMembership.band.avatarUrl}
                            alt={`${currentMembership.band.name} avatar`}
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
                            {currentMembership.band.name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {currentMembership.displayName} • {currentMembership.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 p-6 space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.startsWith(item.href);
                    
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          setLocation(item.href);
                          setIsOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200
                          ${isActive 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'hover:bg-muted text-foreground'
                          }
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
                          <div className="font-medium">{item.label}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    );
                  })}
                </nav>

                {/* Footer */}
                <div className="p-6 border-t border-border">
                  <div className="text-center text-xs text-muted-foreground">
                    bndy • Band Management Platform
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Center: Logo & Page Title */}
          <div className="flex items-center gap-3 flex-1 justify-center">
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

          {/* Right: Theme Toggle & Action Badge */}
          <div className="flex items-center gap-2">
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-sm border-t border-border">
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
    </>
  );
}

export default MobileNavHeader;