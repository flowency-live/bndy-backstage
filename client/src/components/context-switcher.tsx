import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, LogOut, Settings, Users } from "lucide-react";
import type { UserBand, Band } from "@/types/api";

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

interface ContextSwitcherProps {
  currentContextId: string;  // Was currentBandId
  currentMembership: UserBand & { band: Band };  // Will evolve to support venues etc
}

export default function ContextSwitcher({ currentContextId, currentMembership }: ContextSwitcherProps) {
  const [, setLocation] = useLocation();
  const { session, signOut } = useServerAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Get user profile and all bands
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      if (!session?.tokens?.idToken) {
        throw new Error("No access token");
      }
      
      const response = await fetch("/api/me", {
        headers: {
          "Authorization": `Bearer ${session.tokens.idToken}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      
      return response.json();
    },
    enabled: !!session?.tokens?.idToken,
  });

  const handleContextSwitch = (contextId: string) => {
    localStorage.setItem('bndy-selected-context-id', contextId);
    window.location.reload(); // Force a full page reload to switch context
  };

  const handleCreateContext = () => {
    setLocation('/onboarding');  // Will handle venue creation etc in future
  };

  const handleSignOut = async () => {
    localStorage.removeItem('bndy-selected-context-id');
    localStorage.removeItem('bndy-current-user');
    await signOut();
    setLocation('/login');
  };

  const otherContexts = userProfile?.bands.filter(band => band.bandId !== currentContextId) || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-white/20"
          data-testid="button-context-switcher"
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: currentMembership.color }}
            >
              <i className={`fas ${currentMembership.icon} text-white text-sm`}></i>
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{currentMembership.band.name}</div>
              <div className="text-xs text-white/70 truncate">{currentMembership.displayName}</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-white/70" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64" align="start">
        {/* Current Context */}
        <div className="px-2 py-1.5 text-sm font-medium text-gray-700 bg-gray-50">
          Current Context
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

        {/* Other Contexts */}
        {otherContexts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm font-medium text-gray-700 bg-gray-50">
              Switch to
            </div>
            {otherContexts.map((context) => (
              <DropdownMenuItem
                key={context.bandId}
                onClick={() => handleContextSwitch(context.bandId)}
                className="py-3 cursor-pointer"
                data-testid={`button-switch-to-context-${context.bandId}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: context.color }}
                  >
                    <i className={`fas ${context.icon} text-white text-sm`}></i>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{context.band.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {context.displayName} • {context.role}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        
        {/* Actions */}
        <DropdownMenuItem onClick={handleCreateContext} className="cursor-pointer" data-testid="button-create-new-context">
          <Plus className="h-4 w-4 mr-2" />
          Create New Context
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => setLocation('/admin')} className="cursor-pointer" data-testid="button-context-settings">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600" data-testid="button-sign-out">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}