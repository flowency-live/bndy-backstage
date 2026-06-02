import { ChevronDown, Music, Building2, Check, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useUser } from '@/lib/user-context';
import { useBuilder } from '@/lib/builder-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function PersonaSelector() {
  const [, navigate] = useLocation();
  const {
    userProfile,
    currentArtistId,
    currentMembership,
    selectArtist,
    clearArtistSelection,
    isLoading: userLoading,
  } = useUser();

  const {
    builders,
    currentBuilderId,
    currentBuilder,
    isLoading: builderLoading,
    hasBuilders,
    selectBuilder,
    clearBuilderSelection,
  } = useBuilder();

  const isLoading = userLoading || builderLoading;
  const artists = userProfile?.artists || [];
  const hasArtists = artists.length > 0;

  // Determine current persona display
  const currentPersonaName = currentBuilder?.name || currentMembership?.name || 'Select persona';
  const isArtistActive = currentArtistId !== null && !currentBuilderId;
  const isBuilderActive = currentBuilderId !== null;

  const handleArtistSelect = (artistId: string) => {
    clearBuilderSelection();
    selectArtist(artistId);
    navigate('/dashboard');
  };

  const handleBuilderSelect = (builderId: string) => {
    clearArtistSelection();
    selectBuilder(builderId);
    navigate('/builder');
  };

  if (isLoading) {
    return (
      <Button variant="ghost" disabled data-testid="persona-loading">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          {isArtistActive && (
            <Music className="h-4 w-4" data-testid="persona-artist-indicator" />
          )}
          {isBuilderActive && (
            <Building2 className="h-4 w-4" data-testid="persona-builder-indicator" />
          )}
          {!isArtistActive && !isBuilderActive && !hasArtists && !hasBuilders && null}
          <span>{currentPersonaName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {hasArtists && (
          <>
            <DropdownMenuLabel>Artists</DropdownMenuLabel>
            {artists.map((membership) => {
              const isActive = currentArtistId === membership.artist_id;
              return (
                <DropdownMenuItem
                  key={membership.artist_id}
                  data-testid={`persona-item-artist-${membership.artist_id}`}
                  data-active={isActive}
                  onClick={() => handleArtistSelect(membership.artist_id)}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    {membership.name || membership.resolved_display_name}
                  </span>
                  {isActive && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {hasArtists && hasBuilders && <DropdownMenuSeparator />}

        {hasBuilders && (
          <>
            <DropdownMenuLabel>Builders</DropdownMenuLabel>
            {builders.map((builder) => {
              const isActive = currentBuilderId === builder.id;
              return (
                <DropdownMenuItem
                  key={builder.id}
                  data-testid={`persona-item-builder-${builder.id}`}
                  data-active={isActive}
                  onClick={() => handleBuilderSelect(builder.id)}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {builder.name}
                  </span>
                  {isActive && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
