import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function useInvites(artistId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Generate general invite link
  const generateInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/artists/${artistId}/invites/general`);
      return response.json();
    },
    onSuccess: (data) => {
      setInviteLink(data.inviteLink);
      toast({
        title: 'Invite link generated',
        description: 'You can now copy and share the link'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/artists', artistId, 'invites'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to generate invite',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  // Send phone invite
  const sendPhoneInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/artists/${artistId}/invites/phone`, {
        phoneNumber
      });
      return response.json();
    },
    onSuccess: () => {
      setPhoneNumber('');
      toast({
        title: 'Invite sent',
        description: 'SMS invitation has been sent successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/artists', artistId, 'invites'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send invite',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({
        title: 'Link copied',
        description: 'Invite link has been copied to clipboard'
      });
    }
  };

  return {
    inviteLink,
    phoneNumber,
    setPhoneNumber,
    generateInvite: generateInviteMutation.mutate,
    sendPhoneInvite: sendPhoneInviteMutation.mutate,
    copyInviteLink,
    isGenerating: generateInviteMutation.isPending,
    isSending: sendPhoneInviteMutation.isPending
  };
}
