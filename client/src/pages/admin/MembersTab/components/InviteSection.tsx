import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Copy, Send, LinkIcon } from 'lucide-react';

interface InviteSectionProps {
  inviteLink: string | null;
  phoneNumber: string;
  onPhoneNumberChange: (phone: string) => void;
  onGenerateInvite: () => void;
  onSendPhoneInvite: () => void;
  onCopyInviteLink: () => void;
  isGenerating: boolean;
  isSending: boolean;
}

export default function InviteSection({
  inviteLink,
  phoneNumber,
  onPhoneNumberChange,
  onGenerateInvite,
  onSendPhoneInvite,
  onCopyInviteLink,
  isGenerating,
  isSending
}: InviteSectionProps) {
  return (
    <>
      {/* General Invite Link */}
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
              onClick={onGenerateInvite}
              disabled={isGenerating}
            >
              {isGenerating ? (
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
              <Button variant="outline" onClick={onCopyInviteLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Invite */}
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
                onChange={(e) => onPhoneNumberChange(e.target.value)}
                placeholder="+44 7700 900000"
                className="mt-2"
              />
            </div>
            <Button
              onClick={onSendPhoneInvite}
              disabled={!phoneNumber || isSending}
              className="mt-8"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Invite
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
