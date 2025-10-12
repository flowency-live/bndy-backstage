import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ArtistMembership } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface MembersProps {
  artistId: string;
  membership: ArtistMembership;
}

interface Member {
  id: string;
  displayName: string;
  role: string;
  icon: string;
  color: string;
  avatarUrl?: string;
  instrument?: string;
  status: string;
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface Invite {
  token: string;
  artistId: string;
  invitedByUserId: string;
  phone: string | null;
  inviteType: 'general' | 'phone-specific';
  status: 'pending' | 'accepted' | 'expired' | 'disabled';
  expiresAt: number;
  createdAt: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  metadata: {
    artistName: string;
    inviterName: string;
  };
}

export default function Members({ artistId, membership }: MembersProps) {
  // Apply band theme for management pages
  useSectionTheme('band');

  const [, setLocation] = useLocation();
  const { session } = useServerAuth();
  const { toast } = useToast();
  const [invitePhone, setInvitePhone] = useState("");

  // Share invite link using native share dialog (mobile-first)
  const shareInviteLink = async (inviteLink: string, artistName: string) => {
    const shareData = {
      title: `Join ${artistName} on bndy`,
      text: `You've been invited to join ${artistName}! Click the link to accept:`,
      url: inviteLink
    };

    // Check if Web Share API is supported (mobile devices)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Shared!",
          description: "Invite link shared successfully"
        });
        return true;
      } catch (error: any) {
        // User cancelled share dialog - not an error
        if (error.name === 'AbortError') {
          return false;
        }
        console.error('Share failed:', error);
      }
    }

    // Fallback to clipboard copy for desktop
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Link copied!",
        description: "Invite link copied to clipboard. Share it with your team."
      });
      return true;
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive"
      });
      return false;
    }
  };

  // Get artist members
  const { data: membersResponse, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/artists", artistId, "members"],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("GET", `/api/artists/${artistId}/members`);
      const data = await response.json();
      // Handle both array and object responses
      return Array.isArray(data) ? data : (data?.members || []);
    },
    enabled: !!session && !!artistId,
  });

  // Get active invites
  // Note: Backend checks admin/owner permissions, so we don't need to gate the query here
  const { data: invitesData, isLoading: invitesLoading } = useQuery<Invite[]>({
    queryKey: ["/api/artists", artistId, "invites"],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Query DynamoDB for invites for this artist
      const response = await apiRequest("GET", `/api/artists/${artistId}/invites`);

      if (!response.ok) {
        // 403 means not admin/owner - that's fine, just return empty array
        if (response.status === 403) {
          return [];
        }
        throw new Error("Failed to fetch invites");
      }

      return response.json();
    },
    enabled: !!session && !!artistId,
  });

  // Ensure artistMembers is always an array
  const artistMembers: Member[] = Array.isArray(membersResponse) ? membersResponse : (membersResponse?.members || []);
  const activeInvites = invitesData?.filter(invite => invite.status === 'pending') || [];

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("DELETE", `/api/memberships/${membershipId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "events"] });
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  // Disable member mutation (soft delete - sets status to inactive)
  const disableMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("PUT", `/api/memberships/${membershipId}`, {
        status: 'inactive'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "members"] });
      toast({
        title: "Success",
        description: "Member disabled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable member",
        variant: "destructive",
      });
    },
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string, role: string }) => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("PUT", `/api/memberships/${membershipId}`, {
        role: role
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "members"] });
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Disable/remove invite mutation
  const disableInviteMutation = useMutation({
    mutationFn: async (token: string) => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("DELETE", `/api/invites/${token}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "invites"] });
      toast({
        title: "Success",
        description: "Invite link disabled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable invite",
        variant: "destructive",
      });
    },
  });

  if (membersLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-primary font-sans">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <button
            onClick={() => setLocation("/dashboard")}
            className="text-muted-foreground hover:text-foreground transition-colors mb-4 flex items-center gap-2 text-sm"
            data-testid="button-back"
          >
            <i className="fas fa-arrow-left text-xs"></i>
            Back
          </button>

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-bold text-brand-primary mb-2">
              {membership?.artist?.name || membership?.name} Members
            </h1>
            <p className="text-muted-foreground">Manage your team and invite new members</p>
          </div>

          {/* Current Members Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl font-serif">Current Members ({artistMembers.length})</CardTitle>
              <CardDescription>Your active team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {artistMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-muted rounded-xl p-4"
                    data-testid={`member-card-${member.id}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative group flex-shrink-0">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={`${member.displayName} avatar`}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: member.color }}
                          >
                            <i className={`fas ${member.icon} text-white text-xl`}></i>
                          </div>
                        )}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-sans font-semibold text-lg text-card-foreground truncate" data-testid={`member-name-${member.id}`}>
                              {member.displayName}
                            </h4>
                            {(member.user?.firstName || member.user?.lastName) && (
                              <p className="text-sm text-muted-foreground truncate">
                                {member.user.firstName} {member.user.lastName}
                              </p>
                            )}
                            {member.user?.email && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.user.email}</p>
                            )}
                          </div>

                          {/* Actions */}
                          {member.id !== membership.id && (membership.role === 'admin' || membership.role === 'owner') && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Disable button */}
                              <button
                                onClick={() => disableMemberMutation.mutate(member.id)}
                                className="text-orange-500 hover:text-orange-700 p-2"
                                title="Disable member"
                                data-testid={`button-disable-${member.id}`}
                              >
                                <i className="fas fa-ban"></i>
                              </button>

                              {/* Remove button with confirmation */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    className="text-red-500 hover:text-red-700 p-2"
                                    data-testid={`button-remove-${member.id}`}
                                    title="Remove member permanently"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove {member.displayName}? This will permanently delete their membership and all associated events. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removeMemberMutation.mutate(member.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>

                        {/* Member Details */}
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {/* Role */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Role</Label>
                            {member.id !== membership.id && (membership.role === 'admin' || membership.role === 'owner') ? (
                              <Select
                                value={member.role}
                                onValueChange={(newRole) => updateRoleMutation.mutate({ membershipId: member.id, role: newRole })}
                              >
                                <SelectTrigger className="h-8 mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  {membership.role === 'owner' && <SelectItem value="owner">Owner</SelectItem>}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="secondary" className="mt-1">
                                {member.role}
                              </Badge>
                            )}
                          </div>

                          {/* Instrument */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Instrument</Label>
                            <p className="text-sm mt-1">{member.instrument || '-'}</p>
                          </div>

                          {/* Join Date */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Joined</Label>
                            <p className="text-sm mt-1">
                              {member.joinedAt ? format(new Date(member.joinedAt), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>

                          {/* Status */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Status</Label>
                            <Badge
                              variant={member.status === 'active' ? 'default' : 'secondary'}
                              className="mt-1"
                            >
                              {member.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invites Section - only for admins and owners */}
          {(membership.role === 'admin' || membership.role === 'owner') && (
            <>
              {/* Generate Invites Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Invite New Members</CardTitle>
                  <CardDescription>Generate shareable invite links</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* General Invite Link */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">General Invite Link</h4>
                        <p className="text-sm text-muted-foreground">Share this link to invite anyone to join</p>
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await apiRequest("POST", `/api/artists/${artistId}/invites/general`);
                            const data = await response.json();

                            // Refresh invites list
                            queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "invites"] });

                            // Immediately trigger share dialog
                            await shareInviteLink(
                              data.inviteLink,
                              membership?.artist?.name || membership?.name || 'your band'
                            );
                          } catch (error: any) {
                            toast({
                              title: "Error generating link",
                              description: error.message || "Please try again",
                              variant: "destructive"
                            });
                          }
                        }}
                        variant="outline"
                        size="sm"
                        data-testid="button-generate-general-link"
                      >
                        <i className="fas fa-share-nodes mr-2"></i>
                        Generate & Share
                      </Button>
                    </div>
                  </div>

                  {/* Specific Member Invite */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">Send Specific Invite</h4>
                        <p className="text-sm text-muted-foreground">Send a personalized magic link to someone's phone</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="+44 7xxx xxx xxx"
                        className="flex-1"
                        data-testid="input-invite-phone"
                        value={invitePhone}
                        onChange={(e) => setInvitePhone(e.target.value)}
                      />
                      <Button
                        onClick={async () => {
                          if (!invitePhone.trim()) {
                            toast({
                              title: "Phone number required",
                              description: "Please enter a phone number to send the invite",
                              variant: "destructive"
                            });
                            return;
                          }

                          try {
                            const response = await apiRequest("POST", `/api/artists/${artistId}/invites/phone`, {
                              phone: invitePhone
                            });
                            const data = await response.json();

                            // Refresh invites list
                            queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "invites"] });

                            toast({
                              title: "Invite sent!",
                              description: `Magic link sent to ${invitePhone}`,
                              variant: "default"
                            });

                            setInvitePhone("");
                          } catch (error: any) {
                            toast({
                              title: "Error sending invite",
                              description: error.message || "Please try again",
                              variant: "destructive"
                            });
                          }
                        }}
                        variant="action"
                        data-testid="button-send-invite"
                        disabled={!invitePhone.trim()}
                      >
                        <i className="fas fa-paper-plane mr-2"></i>
                        Send Invite
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Invites List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Active Invite Links ({activeInvites.length})</CardTitle>
                  <CardDescription>Manage your pending invitations</CardDescription>
                </CardHeader>
                <CardContent>
                  {invitesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading invites...</p>
                    </div>
                  ) : activeInvites.length === 0 ? (
                    <div className="text-center py-8">
                      <i className="fas fa-envelope-open text-4xl text-muted-foreground mb-3"></i>
                      <p className="text-muted-foreground">No active invite links</p>
                      <p className="text-sm text-muted-foreground">Generate a new invite link above to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeInvites.map((invite) => {
                        const expiryDate = new Date(invite.expiresAt * 1000);
                        const inviteLink = `https://backstage.bndy.co.uk/invite/${invite.token}`;

                        return (
                          <div
                            key={invite.token}
                            className="p-4 bg-muted rounded-lg"
                            data-testid={`invite-card-${invite.token}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={invite.inviteType === 'general' ? 'default' : 'secondary'}>
                                    {invite.inviteType === 'general' ? 'General Link' : 'Phone-Specific'}
                                  </Badge>
                                  <Badge variant="outline" className="text-green-600">
                                    Active
                                  </Badge>
                                </div>

                                {invite.phone && (
                                  <p className="text-sm text-muted-foreground mb-1">
                                    Sent to: {invite.phone}
                                  </p>
                                )}

                                <p className="text-xs text-muted-foreground mb-2">
                                  Created {format(new Date(invite.createdAt), 'dd/MM/yyyy HH:mm')} •
                                  Expires {format(expiryDate, 'dd/MM/yyyy')}
                                </p>

                                <div className="flex items-center gap-2 mb-3">
                                  <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate">
                                    {inviteLink}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      await navigator.clipboard.writeText(inviteLink);
                                      toast({
                                        title: "Copied!",
                                        description: "Invite link copied to clipboard",
                                      });
                                    }}
                                    data-testid={`button-copy-${invite.token}`}
                                    title="Copy link"
                                  >
                                    <i className="fas fa-copy"></i>
                                  </Button>
                                </div>

                                {/* Share Button - Mobile First */}
                                <Button
                                  onClick={() => shareInviteLink(inviteLink, invite.metadata.artistName)}
                                  variant="default"
                                  size="sm"
                                  className="w-full"
                                  data-testid={`button-share-${invite.token}`}
                                >
                                  <i className="fas fa-share-nodes mr-2"></i>
                                  Share Invite
                                </Button>
                              </div>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    data-testid={`button-disable-invite-${invite.token}`}
                                    title="Disable invite"
                                  >
                                    <i className="fas fa-ban"></i>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Disable Invite Link</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to disable this invite link? It will no longer work and cannot be re-enabled.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => disableInviteMutation.mutate(invite.token)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Disable
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
