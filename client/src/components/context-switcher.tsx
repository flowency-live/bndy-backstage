import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useUser } from "@/lib/user-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, LogOut, Settings, Eye, Users } from "lucide-react";
import type { ArtistMembership } from "@/types/api";

interface UserProfile {
  user: {
    id: string;
    supabaseId?: string;
    email: string | null;
    phone?: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  artists: ArtistMembership[];
}

interface ContextSwitcherProps {
  currentContextId: string;  // Artist ID
  currentMembership: ArtistMembership;
}

export default function ContextSwitcher({ currentContextId, currentMembership }: ContextSwitcherProps) {
  const [, setLocation] = useLocation();
  const { session, signOut } = useServerAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { isUberAdmin, isStealthMode } = useUser();

  // Get user profile and all artists (memberships)
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/memberships/me"],
    queryFn: async () => {
      const response = await fetch("https://api.bndy.co.uk/api/memberships/me", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user memberships");
      }

      return response.json();
    },
    enabled: !!session,
  });

  const handleContextSwitch = (artistId: string) => {
    localStorage.setItem('bndy-selected-artist-id', artistId);
    window.location.reload(); // Force a full page reload to switch context
  };

  const availableArtists = userProfile?.artists || [];

  const handleCreateContext = () => {
    setLocation('/onboarding');  // Will handle venue creation etc in future
  };

  const handleSignOut = async () => {
    localStorage.removeItem('bndy-selected-artist-id');
    localStorage.removeItem('bndy-selected-context-id'); // Legacy cleanup
    localStorage.removeItem('bndy-current-user'); // Legacy cleanup
    await signOut();
    setLocation('/login');
  };

  const otherContexts = availableArtists.filter(artist => artist.artist_id !== currentContextId) || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-white/20"
          data-testid="button-context-switcher"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: currentMembership.color }}
            >
              <i className={`fas ${currentMembership.icon} text-white text-sm`}></i>
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="font-medium text-sm truncate flex items-center gap-2">
                {currentMembership.artist?.name || currentMembership.name}
                {isStealthMode && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-white/20">
                    <Eye className="h-2.5 w-2.5" />
                  </Badge>
                )}
              </div>
              <div className="text-xs text-white/70 truncate">{currentMembership.resolved_display_name || currentMembership.display_name}</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-white/70 flex-shrink-0" />
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
              <div className="font-medium text-sm truncate">{currentMembership.artist?.name || currentMembership.name}</div>
              <div className="text-xs text-gray-500 truncate">
                {currentMembership.resolved_display_name || currentMembership.display_name} • {currentMembership.role}
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
            {otherContexts.map((membership) => (
              <DropdownMenuItem
                key={membership.artist_id}
                onClick={() => handleContextSwitch(membership.artist_id)}
                className="py-3 cursor-pointer"
                data-testid={`button-switch-to-context-${membership.artist_id}`}
              >
                <div className="flex items-center gap-3 w-full">
                  {membership.artist?.profileImageUrl || membership.resolved_avatar_url ? (
                    <img
                      src={membership.artist?.profileImageUrl || membership.resolved_avatar_url}
                      alt={`${membership.artist?.name || membership.name} avatar`}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: membership.color }}
                    >
                      <i className={`fas ${membership.icon} text-white text-sm`}></i>
                    </div>
                  )}
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{membership.artist?.name || membership.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {membership.resolved_display_name || membership.display_name} • {membership.role}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />

        {/* Actions */}
        {isUberAdmin && (
          <DropdownMenuItem onClick={() => setLocation('/my-artists')} className="cursor-pointer" data-testid="button-all-artists">
            <Users className="h-4 w-4 mr-2" />
            All Artists
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleCreateContext} className="cursor-pointer" data-testid="button-create-new-context">
          <Plus className="h-4 w-4 mr-2" />
          Create New Artist
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