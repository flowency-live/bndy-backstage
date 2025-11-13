import { useLocation } from 'wouter';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/lib/services/notifications-service';

interface HighPriorityModalProps {
  notification: Notification;
  onDismiss: () => void;
  onViewNow: () => void;
}

export function HighPriorityModal({
  notification,
  onDismiss,
  onViewNow,
}: HighPriorityModalProps) {
  const [, setLocation] = useLocation();

  const handleViewNow = () => {
    const routes: Record<string, string> = {
      vote_reminder: '/pipeline?status=voting',
      gig_added: '/calendar',
      gig_removed: '/calendar',
      song_ready: '/pipeline',
      song_added: '/pipeline',
      rehearsal_added: '/calendar',
      rehearsal_removed: '/calendar',
    };

    const targetRoute = routes[notification.type];
    if (targetRoute) {
      setLocation(targetRoute);
    }
    onViewNow();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-cyan-500" />
            </div>
            <DialogTitle>Action Required</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            {notification.message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1"
          >
            Dismiss
          </Button>
          <Button
            onClick={handleViewNow}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600"
          >
            View Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
