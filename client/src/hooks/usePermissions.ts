import { useUser } from "@/lib/user-context";

export interface Permissions {
  // Artist profile
  canEditArtistProfile: boolean;
  canUploadAvatar: boolean;

  // Events/Calendar
  canViewEvents: boolean;
  canCreateGigs: boolean;
  canCreateRehearsals: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;

  // Songs
  canViewSongs: boolean;
  canCreateSongs: boolean;
  canEditSongs: boolean;
  canVoteSongs: boolean;

  // Setlists
  canViewSetlists: boolean;
  canEditSetlists: boolean;

  // Members
  canViewMembers: boolean;
  canManageMembers: boolean;

  // Pipeline
  canViewPipeline: boolean;
  canManagePipeline: boolean;

  // Invites
  canGenerateInvites: boolean;
}

/**
 * Permission hook for stealth mode and regular members
 *
 * Platform Admin (Stealth Mode):
 * - Full artist profile edit (including avatar)
 * - Can create gigs only (no rehearsals)
 * - Read-only: songs, setlists, members, pipeline
 * - Can generate invites
 *
 * Regular Members:
 * - Permissions based on role (owner/admin/member)
 */
export function usePermissions(): Permissions {
  const { isStealthMode, currentMembership } = useUser();

  // Stealth mode permissions (platform admin in backstage area)
  if (isStealthMode) {
    return {
      canEditArtistProfile: true,
      canUploadAvatar: true,

      canViewEvents: true,
      canCreateGigs: true,
      canCreateRehearsals: false,  // Gigs only!
      canEditEvents: false,
      canDeleteEvents: false,

      canViewSongs: true,
      canCreateSongs: false,
      canEditSongs: false,
      canVoteSongs: false,

      canViewSetlists: true,
      canEditSetlists: false,

      canViewMembers: true,
      canManageMembers: false,

      canViewPipeline: true,
      canManagePipeline: false,

      canGenerateInvites: true,
    };
  }

  // Regular member permissions (existing logic)
  const role = currentMembership?.role;

  return {
    canEditArtistProfile: ['owner', 'admin'].includes(role || ''),
    canUploadAvatar: ['owner', 'admin'].includes(role || ''),

    canViewEvents: true,
    canCreateGigs: ['owner', 'admin', 'member'].includes(role || ''),
    canCreateRehearsals: ['owner', 'admin', 'member'].includes(role || ''),
    canEditEvents: ['owner', 'admin'].includes(role || ''),
    canDeleteEvents: role === 'owner',

    canViewSongs: true,
    canCreateSongs: ['owner', 'admin', 'member'].includes(role || ''),
    canEditSongs: ['owner', 'admin'].includes(role || ''),
    canVoteSongs: ['owner', 'admin', 'member'].includes(role || ''),

    canViewSetlists: true,
    canEditSetlists: ['owner', 'admin', 'member'].includes(role || ''),

    canViewMembers: true,
    canManageMembers: ['owner', 'admin'].includes(role || ''),

    canViewPipeline: true,
    canManagePipeline: ['owner', 'admin'].includes(role || ''),

    canGenerateInvites: ['owner', 'admin'].includes(role || ''),
  };
}
