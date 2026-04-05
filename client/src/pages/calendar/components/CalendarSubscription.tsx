/**
 * CalendarSubscriptionModal Component
 *
 * Modal for managing calendar subscription tokens for iCal feed access.
 * Syncs public gigs and rehearsals to external calendar apps.
 */

import { useState, useEffect } from 'react';
import { Copy, Check, Trash2, RefreshCw, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { eventsService, type CalendarSubscription as SubscriptionType } from '@/lib/services/events-service';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface CalendarSubscriptionModalProps {
  artistId: string | null;
  open: boolean;
  onClose: () => void;
}

export function CalendarSubscriptionModal({ artistId, open, onClose }: CalendarSubscriptionModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSubscription, setGeneratedSubscription] = useState<SubscriptionType | null>(null);
  const [existingSubscriptions, setExistingSubscriptions] = useState<SubscriptionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const { toast } = useToast();

  const isDisabled = !artistId;

  // Load existing subscriptions when modal opens
  useEffect(() => {
    if (artistId && open) {
      loadSubscriptions();
    }
  }, [artistId, open]);

  const loadSubscriptions = async () => {
    if (!artistId) return;

    setIsLoading(true);
    try {
      const result = await eventsService.getCalendarSubscriptions(artistId);
      setExistingSubscriptions(result.subscriptions);
    } catch (error) {
      // Silent fail - not critical
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSubscription = async () => {
    if (!artistId) return;

    setIsGenerating(true);
    try {
      const subscription = await eventsService.createCalendarSubscription(artistId, 'default');
      setGeneratedSubscription(subscription);
      loadSubscriptions();

      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(subscription.webcalUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
        toast({
          title: 'URL copied to clipboard',
          description: 'Paste this in your calendar app to subscribe',
        });
      } catch {
        toast({
          title: 'Subscription created',
          description: 'Click copy to get your subscription URL',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to create subscription',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!generatedSubscription) return;

    try {
      await navigator.clipboard.writeText(generatedSubscription.webcalUrl);
      setCopiedUrl(true);
      toast({
        title: 'Copied to clipboard',
        description: 'Paste this URL in your calendar app',
      });
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the URL manually',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeSubscription = async (token: string) => {
    if (!artistId) return;

    try {
      await eventsService.revokeCalendarSubscription(artistId, token);
      setExistingSubscriptions((prev) => prev.filter((s) => s.token !== token));
      if (generatedSubscription?.token === token) {
        setGeneratedSubscription(null);
      }
      toast({
        title: 'Subscription revoked',
        description: 'The calendar URL will no longer work',
      });
    } catch (error) {
      toast({
        title: 'Failed to revoke',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      return format(parseISO(dateStr), 'do MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Calendar Sync
          </DialogTitle>
          <DialogDescription>
            Subscribe to your calendar from Google Calendar, Apple Calendar, or Outlook
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Info */}
          <p className="text-sm text-muted-foreground">
            Syncs your public gigs and rehearsals to your calendar app.
          </p>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateSubscription}
            disabled={isDisabled || isGenerating}
            className="w-full"
            data-testid="generate-subscription-button"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Link className="w-4 h-4 mr-2" />
                Generate Subscription URL
              </>
            )}
          </Button>

          {/* Generated URL Display */}
          {generatedSubscription && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Your subscription URL</label>
              <div className="flex gap-2">
                <Input
                  value={generatedSubscription.webcalUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  data-testid="copy-url-button"
                >
                  {copiedUrl ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This URL auto-syncs. Your calendar app will check for updates periodically.
              </p>
            </div>
          )}

          {/* Instructions Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="instructions">
              <AccordionTrigger className="text-sm">How to add to your calendar</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="google">
                    <AccordionTrigger className="text-sm">
                      <span className="flex items-center gap-2">
                        <i className="fab fa-google"></i>
                        Google Calendar
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open Google Calendar on your computer</li>
                        <li>Click the + next to "Other calendars"</li>
                        <li>Select "From URL"</li>
                        <li>Paste the subscription URL</li>
                        <li>Click "Add calendar"</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="apple">
                    <AccordionTrigger className="text-sm">
                      <span className="flex items-center gap-2">
                        <i className="fab fa-apple"></i>
                        Apple Calendar
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open Calendar app</li>
                        <li>File → New Calendar Subscription</li>
                        <li>Paste the subscription URL</li>
                        <li>Click "Subscribe"</li>
                        <li>Set refresh frequency to "Every hour" or "Every day"</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="outlook">
                    <AccordionTrigger className="text-sm">
                      <span className="flex items-center gap-2">
                        <i className="fab fa-microsoft"></i>
                        Outlook
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open Outlook Calendar</li>
                        <li>Click "Add calendar" → "Subscribe from web"</li>
                        <li>Paste the subscription URL</li>
                        <li>Give it a name and click "Import"</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Existing Subscriptions */}
          {existingSubscriptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Active Subscriptions</label>
              <div className="space-y-2">
                {existingSubscriptions.map((sub) => (
                  <div
                    key={sub.token}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        Created {formatDate(sub.createdAt)}
                      </span>
                      <div className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                        {sub.token}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeSubscription(sub.token)}
                      className="text-destructive hover:text-destructive"
                      data-testid="revoke-subscription-button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keep the old export name for backwards compatibility
export { CalendarSubscriptionModal as CalendarSubscription };
