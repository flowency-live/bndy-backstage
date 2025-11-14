import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Member {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  instrument: string | null;
  role: string;
  joinedAt: string;
}

export function useMembers(artistId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch members
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['/api/artists', artistId, 'members'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/artists/${artistId}/members`);
      return response.json();
    },
    enabled: !!artistId,
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const response = await apiRequest('DELETE', `/api/memberships/${membershipId}`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/artists', artistId, 'members'] });
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the artist'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove member',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  return {
    members,
    isLoading,
    removeMember: removeMemberMutation.mutate,
    isRemoving: removeMemberMutation.isPending
  };
}
