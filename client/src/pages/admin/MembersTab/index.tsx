import { useAdminContext } from '../AdminContext';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import MembersList from './components/MembersList';
import InviteSection from './components/InviteSection';
import ActiveInvitesList from './components/ActiveInvitesList';
import { useMembers } from './hooks/useMembers';
import { useInvites } from './hooks/useInvites';

export default function MembersTab() {
  const { artistId, membership } = useAdminContext();

  // Use custom hooks for data and mutations
  const { members, isLoading: membersLoading, removeMember, isRemoving } = useMembers(artistId);
  const {
    inviteLink,
    phoneNumber,
    setPhoneNumber,
    generateInvite,
    sendPhoneInvite,
    copyInviteLink,
    isGenerating,
    isSending
  } = useInvites(artistId);

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
      <MembersList
        members={members}
        currentMembershipId={membership.id}
        canManageMembers={canManageMembers}
        onRemoveMember={removeMember}
        isRemoving={isRemoving}
      />

      {/* Invite Section */}
      {canManageMembers && (
        <>
          <InviteSection
            inviteLink={inviteLink}
            phoneNumber={phoneNumber}
            onPhoneNumberChange={setPhoneNumber}
            onGenerateInvite={generateInvite}
            onSendPhoneInvite={sendPhoneInvite}
            onCopyInviteLink={copyInviteLink}
            isGenerating={isGenerating}
            isSending={isSending}
          />

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Active Invites</h3>
            <ActiveInvitesList artistId={artistId} />
          </div>
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
