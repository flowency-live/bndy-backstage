import { useState, createContext, useContext } from "react";
import { useLocation } from "wouter";
import SideNav, { BurgerMenuButton } from "@/components/side-nav";
import { MobileNavHeader } from "@/components/mobile-nav";
import BndyLogo from "@/components/ui/bndy-logo";
import type { ArtistMembership } from "@/types/api";

interface NavigationContextType {
  isNavOpen: boolean;
  openNav: () => void;
  closeNav: () => void;
  toggleNav: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

interface NavigationProviderProps {
  children: React.ReactNode;
}

function NavigationProvider({ children }: NavigationProviderProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const openNav = () => setIsNavOpen(true);
  const closeNav = () => setIsNavOpen(false);
  const toggleNav = () => setIsNavOpen(!isNavOpen);

  return (
    <NavigationContext.Provider value={{ isNavOpen, openNav, closeNav, toggleNav }}>
      {children}
    </NavigationContext.Provider>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  artistId?: string;
  membership?: ArtistMembership;
  isLoading?: boolean;
}

export function AppLayout({ children, artistId, membership, isLoading = false }: AppLayoutProps) {
  const { isNavOpen, closeNav } = useNavigation();
  const [location] = useLocation();

  // Don't show navigation on auth pages or landing page
  const hideNavigation = ["/", "/login", "/onboarding"].includes(location) || location.startsWith("/invite/");

  if (hideNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row max-w-full overflow-hidden">
      {/* Mobile Navigation Header - Fixed at top */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40">
        <MobileNavHeader
          currentArtistId={artistId}
          currentMembership={membership}
          isLoading={isLoading}
        />
      </div>

      {/* Desktop Side Navigation - Fixed on left */}
      <div className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 lg:z-40">
        <SideNav
          isOpen={isNavOpen}
          onClose={closeNav}
        />
      </div>

      {/* Main Content - Scrollable with offset for fixed header/sidebar */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-[4rem] lg:pt-0 lg:ml-64 pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}

interface PageHeaderProps {
  title?: string;
  children?: React.ReactNode;
  showBurgerMenu?: boolean;
}

export function PageHeader({ title, children, showBurgerMenu = true }: PageHeaderProps) {
  const { toggleNav } = useNavigation();
  const [location] = useLocation();

  // Don't show header on auth pages or landing page
  const hideHeader = ["/", "/login", "/onboarding"].includes(location) || location.startsWith("/invite/");

  if (hideHeader) {
    return null;
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-30 lg:hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side: Burger Menu Button and Logo */}
          <div className="flex items-center gap-3">
            {showBurgerMenu && (
              <BurgerMenuButton onClick={toggleNav} />
            )}
            <BndyLogo className="h-8 w-auto" color="hsl(var(--primary))" />
          </div>

          {/* Center: Title */}
          {title && (
            <h1 className="text-foreground font-serif font-semibold text-xl">{title}</h1>
          )}

          {/* Right side: Additional content */}
          <div className="flex items-center gap-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced App Layout with Navigation Provider
interface EnhancedAppLayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: EnhancedAppLayoutProps) {
  return (
    <NavigationProvider>
      {children}
    </NavigationProvider>
  );
}