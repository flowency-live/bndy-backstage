import { useLocation } from 'wouter';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './notification-item';
import { useNotifications } from '@/hooks/use-notifications';
import type { Notification } from '@/lib/services/notifications-service';

interface NotificationPopoverProps {
  onClose: () => void;
}

export function NotificationPopover({ onClose }: NotificationPopoverProps) {
  const [, setLocation] = useLocation();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const recentNotifications = notifications.slice(0, 10);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    const routes: Record<string, string> = {
      song_added: '/playbook',
      song_ready: '/playbook',
      gig_added: '/calendar',
      gig_removed: '/calendar',
      rehearsal_added: '/calendar',
      rehearsal_removed: '/calendar',
    };

    const targetRoute = routes[notification.type];
    if (targetRoute) {
      setLocation(targetRoute);
    }
    onClose();
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {notifications.some((n) => !n.read) && (
          <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
            Mark all read
          </Button>
        )}
      </div>

      <div className="overflow-y-auto divide-y">
        {recentNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={() => handleNotificationClick(notification)}
          />
        ))}
      </div>
    </div>
  );
}
