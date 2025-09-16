import { useState, createContext, useContext } from "react";
import { useLocation } from "wouter";
import SideNav, { BurgerMenuButton } from "@/components/side-nav";
import BndyLogo from "@/components/ui/bndy-logo";
import type { UserBand, Band } from "@shared/schema";

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
  bandId?: string;
  membership?: UserBand & { band: Band };
}

export function AppLayout({ children, bandId, membership }: AppLayoutProps) {
  const { isNavOpen, closeNav } = useNavigation();
  const [location] = useLocation();

  // Don't show navigation on auth pages or landing page
  const hideNavigation = ["/", "/login", "/onboarding"].includes(location) || location.startsWith("/invite/");

  if (hideNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Side Navigation */}
      <SideNav
        currentBandId={bandId}
        currentMembership={membership}
        isOpen={isNavOpen}
        onClose={closeNav}
      />

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
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
            <BndyLogo className="h-8 w-auto" color="#f97316" />
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