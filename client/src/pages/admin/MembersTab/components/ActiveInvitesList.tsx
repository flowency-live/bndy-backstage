import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Copy, Link as LinkIcon, Phone, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { invitesService } from '@/lib/services/invites-service';
import type { Invite } from '@/lib/services/invites-service';

interface ActiveInvitesListProps {
  artistId: string;
}

export default function ActiveInvitesList({ artistId }: ActiveInvitesListProps) {
  const { toast } = useToast();

  const { data: invites, isLoading, refetch } = useQuery<Invite[]>({
    queryKey: ['/api/artists', artistId, 'invites'],
    queryFn: () => invitesService.listInvites(artistId),
  });

  const disableMutation = useMutation({
    mutationFn: (token: string) => invitesService.disableInvite(token),
    onSuccess: () => {
      toast({
        title: "Invite disabled",
        description: "The invite link has been disabled",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable invite",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (token: string) => {
    const link = invitesService.getInviteLink(token);
    await navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Invite link copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invites || invites.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <LinkIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No active invites</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => {
        const isExpired = invite.status === 'expired' || Date.now() > invite.expiresAt;
        const isDisabled = invite.status === 'disabled';

        return (
          <Card key={invite.token} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge
                      variant={invite.inviteType === 'phone-specific' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {invite.inviteType === 'phone-specific' ? (
                        <>
                          <Phone className="h-3 w-3 mr-1" />
                          Phone
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-3 w-3 mr-1" />
                          General
                        </>
                      )}
                    </Badge>
                    {isExpired && (
                      <Badge variant="destructive" className="text-xs">
                        Expired
                      </Badge>
                    )}
                    {isDisabled && (
                      <Badge variant="outline" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                    {invite.acceptanceCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {invite.acceptanceCount} {invite.acceptanceCount === 1 ? 'acceptance' : 'acceptances'}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Created: {format(new Date(invite.createdAt), 'MMM d, yyyy')}
                    </div>
                    <div>
                      Expires: {format(new Date(invite.expiresAt), 'MMM d, yyyy')}
                    </div>
                    {invite.inviteType === 'phone-specific' && invite.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{invite.phone}</span>
                      </div>
                    )}
                  </div>

                  {invite.acceptedBy && invite.acceptedBy.length > 0 && (
                    <div className="pt-3 border-t border-border mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Accepted by {invite.acceptedBy.length} {invite.acceptedBy.length === 1 ? 'person' : 'people'}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {invite.acceptedBy.slice(0, 5).map((acceptance, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {format(new Date(acceptance.acceptedAt), 'MMM d')}
                          </Badge>
                        ))}
                        {invite.acceptedBy.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{invite.acceptedBy.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {!isExpired && !isDisabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(invite.token)}
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                  )}
                  {!isDisabled && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Disable
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disable this invite?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will prevent anyone from using this invite link to join your artist profile.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => disableMutation.mutate(invite.token)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Disable Invite
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
