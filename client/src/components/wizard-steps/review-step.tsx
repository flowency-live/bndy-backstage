// ReviewStep - Final review with conflict detection before submission
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  MapPin,
  Calendar,
  Clock,
  FileText,
  Ticket,
  PoundSterling,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { PublicGigFormData } from '@/components/public-gig-wizard';

interface ReviewStepProps {
  formData: PublicGigFormData;
  artistId: string;
  artistName: string;
  onUpdate: (data: Partial<PublicGigFormData>) => void;
}

export default function ReviewStep({ formData, artistId, artistName, onUpdate }: ReviewStepProps) {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(true);

  // Check for conflicts on mount
  useEffect(() => {
    const checkConflicts = async () => {
      if (!formData.date) {
        setCheckingConflicts(false);
        return;
      }

      try {
        const response = await fetch(
          `https://api.bndy.co.uk/api/artists/${artistId}/events/check-conflicts`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: formData.date,
              type: 'public_gig',
              startTime: formData.startTime,
              endTime: formData.endTime,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.hasConflicts) {
            setConflicts(data.conflicts || []);
          }
        }
      } catch (error) {
        console.error('Conflict check error:', error);
      } finally {
        setCheckingConflicts(false);
      }
    };

    checkConflicts();
  }, [formData.date, formData.startTime, formData.endTime, artistId]);

  const formatTime = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  return (
    <div className="space-y-6">
      {/* Conflict Warning */}
      {checkingConflicts ? (
        <Alert>
          <Loader2 className="w-4 h-4 animate-spin" />
          <AlertDescription>Checking for scheduling conflicts...</AlertDescription>
        </Alert>
      ) : conflicts.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Scheduling Conflicts Detected</div>
            <p className="text-sm">
              You have {conflicts.length} existing event(s) on this date:
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {conflicts.map((conflict, idx) => (
                <li key={idx}>
                  • {conflict.title || conflict.type} ({conflict.startTime || 'all day'})
                </li>
              ))}
            </ul>
            <p className="text-sm mt-2 font-medium">
              You can still create this gig, but be aware of the conflict.
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            No scheduling conflicts found. You're good to go!
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Sections */}
      <div className="space-y-4">
        {/* Venue */}
        <div className="bg-accent/30 rounded-xl p-4 border border-border">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground mb-1">Venue</div>
              <div className="font-semibold text-foreground">{formData.venueName}</div>
              <div className="text-sm text-muted-foreground mt-1">{formData.venueAddress}</div>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-accent/30 rounded-xl p-4 border border-border">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">Date</div>
                <div className="font-semibold text-foreground">
                  {formData.date
                    ? format(new Date(formData.date + 'T00:00:00'), 'EEEE, dd MMMM yyyy')
                    : '-'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">Times</div>
                <div className="space-y-1">
                  {formData.doorsTime && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Doors:</span>{' '}
                      <span className="font-medium">{formatTime(formData.doorsTime)}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Set:</span>{' '}
                    <span className="font-medium">
                      {formatTime(formData.startTime)} - {formatTime(formData.endTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="bg-accent/30 rounded-xl p-4 border border-border">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground mb-1">Title</div>
                <div className="font-semibold text-foreground break-words">
                  {formData.title || `${artistName} @ ${formData.venueName}`}
                </div>
              </div>
            </div>

            {formData.description && (
              <div className="pl-8">
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {formData.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Info (if provided) */}
        {(formData.ticketUrl || formData.ticketPrice) && (
          <div className="bg-accent/30 rounded-xl p-4 border border-border">
            <div className="space-y-3">
              {formData.ticketPrice && (
                <div className="flex items-start gap-3">
                  <PoundSterling className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Price</div>
                    <div className="font-medium text-foreground">{formData.ticketPrice}</div>
                  </div>
                </div>
              )}

              {formData.ticketUrl && (
                <div className="flex items-start gap-3">
                  <Ticket className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground mb-1">Tickets</div>
                    <a
                      href={formData.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {formData.ticketUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visibility Toggle */}
      <div className="bg-accent/30 rounded-xl p-4 border border-border">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!formData.isPublic && formData.isPublic !== undefined}
            onChange={(e) => onUpdate({ isPublic: !e.target.checked })}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <div className="flex-1">
            <div className="font-medium text-foreground">Private Event (Not visible on bndy.live)</div>
            <div className="text-sm text-muted-foreground mt-1">
              Keep this gig off the public calendar. It will only appear in your Backstage calendar.
            </div>
          </div>
        </label>
      </div>

      {/* Confirmation Message */}
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
        <p className="font-medium mb-2">✓ Ready to create</p>
        <p className="text-xs">
          {formData.isPublic === false ? (
            <>This gig will be <strong>private</strong> and only visible in your Backstage calendar.</>
          ) : (
            <>This gig will appear on <strong>bndy.live</strong> for fans to discover.</>
          )}
          {conflicts.length > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400 block mt-1">
              ⚠️ Note: You have scheduling conflicts - double check your calendar!
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
