import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminContext } from '../AdminContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, UserPlus, Copy, Send, Trash2, Link as LinkIcon } from 'lucide-react';
import ActiveInvitesList from '@/components/ActiveInvitesList';

interface Member {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  instrument: string | null;
  role: string;
  joinedAt: string;
}

export default function MembersTab() {
  const { artistId, membership } = useAdminContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Fetch members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['/api/artists', artistId, 'members'],
    enabled: !!artistId
  });

  const members: Member[] = membersData?.members || [];

  // Generate general invite link
  const generateInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/artists/${artistId}/invites/general`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setInviteLink(data.inviteLink);
      toast({
        title: 'Invite link generated',
        description: 'Share this link with people you want to invite'
      });
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
    },
    onError: (error) => {
      toast({
        title: 'Failed to send invite',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  // Remove member
  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const response = await apiRequest('DELETE', `/memberships/${membershipId}`, null);
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

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({
        title: 'Link copied',
        description: 'Invite link has been copied to clipboard'
      });
    }
  };

  const canManageMembers = membership.role === 'owner' || membership.role === 'admin';

  if (membersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Members</h2>
        <p className="text-muted-foreground mt-1">
          Manage band members and send invites
        </p>
      </div>

      {/* Member List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Band Members ({members.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>
                      {member.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.instrument || 'No instrument set'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  {canManageMembers && member.role !== 'owner' && member.id !== membership.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remove ${member.displayName} from the band?`)) {
                          removeMemberMutation.mutate(member.id);
                        }
                      }}
                      disabled={removeMemberMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite Section */}
      {canManageMembers && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                General Invite Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a magic link that anyone can use to join your artist. Link expires in 7 days.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => generateInviteMutation.mutate()}
                  disabled={generateInviteMutation.isPending}
                >
                  {generateInviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Generate Invite Link
                </Button>
              </div>
              {inviteLink && (
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="font-mono text-sm" />
                  <Button variant="outline" onClick={copyInviteLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Invite by Phone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send an SMS invitation directly to someone's phone number.
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+44 7700 900000"
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={() => sendPhoneInviteMutation.mutate()}
                  disabled={!phoneNumber || sendPhoneInviteMutation.isPending}
                  className="mt-8"
                >
                  {sendPhoneInviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>

          <ActiveInvitesList artistId={artistId} />
        </>
      )}

      {!canManageMembers && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Only owners and admins can manage members and send invites.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
