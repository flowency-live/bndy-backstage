import { Music, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type Notification,
  type NotificationType,
} from '@/lib/services/notifications-service';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  song_added: <Music className="h-5 w-5 text-primary" />,
  song_ready: <Music className="h-5 w-5 text-green-500" />,
  gig_added: <Calendar className="h-5 w-5 text-blue-500" />,
  gig_removed: <Calendar className="h-5 w-5 text-red-500" />,
  rehearsal_added: <Calendar className="h-5 w-5 text-purple-500" />,
  rehearsal_removed: <Calendar className="h-5 w-5 text-orange-500" />,
};

export function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const timestamp = new Date(notification.created_at);
  const isRecent = Date.now() - timestamp.getTime() < 24 * 60 * 60 * 1000;

  const formattedTime = isRecent
    ? formatDistanceToNow(timestamp, { addSuffix: true })
    : timestamp.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <div
      className={cn(
        'p-4 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.read && 'bg-primary/5 font-medium'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {notificationIcons[notification.type]}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm">{notification.message}</p>
          <span className="text-xs text-muted-foreground mt-1 block">
            {formattedTime}
          </span>
        </div>

        {!notification.read && (
          <Badge variant="secondary" className="flex-shrink-0 h-2 w-2 p-0 rounded-full" />
        )}
      </div>
    </div>
  );
}
