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
  editingEventId?: string;
}

export default function ReviewStep({ formData, artistId, artistName, onUpdate, editingEventId }: ReviewStepProps) {
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
        const requestBody = {
          date: formData.date,
          type: 'gig',
          startTime: formData.startTime,
          endTime: formData.endTime,
          excludeEventId: editingEventId, // Exclude current event when editing
        };

        console.log('Conflict check request:', { requestBody, editingEventId });

        const response = await fetch(
          `https://api.bndy.co.uk/api/artists/${artistId}/events/check-conflicts`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
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
  }, [formData.date, formData.startTime, formData.endTime, artistId, editingEventId]);

  const formatTime = (time?: string) => {
    if (!time) return null;
    // Special display for midnight
    if (time === '00:00') {
      return 'Midnight';
    }
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
              {conflicts.map((conflict, idx) => {
                // Format conflict description
                let description = conflict.title || conflict.type;

                // If unavailability, show user's display name
                if (conflict.type === 'unavailability' && conflict.displayName) {
                  description = `${conflict.displayName} unavailable`;
                }

                const timeInfo = conflict.startTime || 'all day';

                return (
                  <li key={idx}>
                    • {description} ({timeInfo})
                  </li>
                );
              })}
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
            <MapPin className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground">{formData.venueName}</div>
              <div className="text-sm text-muted-foreground mt-1">{formData.venueAddress}</div>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-accent/30 rounded-xl p-4 border border-border">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-foreground">
                  {formData.date
                    ? format(new Date(formData.date + 'T00:00:00'), 'EEEE, dd MMMM yyyy')
                    : '-'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm">
                  <span className="font-medium">
                    {formatTime(formData.startTime)}
                    {formData.endTime && formData.endTime !== '00:00' && (
                      <> - {formatTime(formData.endTime)}</>
                    )}
                    {(!formData.endTime || formData.endTime === '00:00') && (
                      <> - Midnight</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="bg-accent/30 rounded-xl p-4 border border-border">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground break-words">
                  {formData.title || `${artistName} @ ${formData.venueName}`}
                </div>
              </div>
            </div>

            {formData.description && (
              <div className="pl-8">
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
                  <PoundSterling className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{formData.ticketPrice}</div>
                  </div>
                </div>
              )}

              {formData.ticketUrl && (
                <div className="flex items-start gap-3">
                  <Ticket className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
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
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-medium text-foreground">
            {formData.isPublic === false
              ? 'Private Event (Not visible on bndy.live)'
              : 'Public Event (listed on bndy.live)'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={formData.isPublic !== false}
            onClick={() => onUpdate({ isPublic: formData.isPublic === false ? true : false })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              formData.isPublic === false ? 'bg-gray-400' : 'bg-orange-500'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                formData.isPublic === false ? 'translate-x-0' : 'translate-x-5'
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
