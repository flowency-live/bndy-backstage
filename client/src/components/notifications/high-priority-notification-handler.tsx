import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/lib/services/notifications-service';
import { HighPriorityModal } from './high-priority-modal';
import { useNotifications } from '@/hooks/use-notifications';

export function HighPriorityNotificationHandler() {
  const queryClient = useQueryClient();
  const { dismissNotification, markAsRead } = useNotifications();
  const [currentNotification, setCurrentNotification] = useState<any>(null);

  const { data: highPriorityNotifications } = useQuery({
    queryKey: ['high-priority-notifications'],
    queryFn: () => notificationsService.getHighPriorityNotifications(),
    refetchInterval: 60000, // Check every 60 seconds
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (highPriorityNotifications && highPriorityNotifications.length > 0) {
      // Show the most recent high-priority notification
      const sortedNotifications = [...highPriorityNotifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setCurrentNotification(sortedNotifications[0]);
    } else {
      setCurrentNotification(null);
    }
  }, [highPriorityNotifications]);

  const handleDismiss = () => {
    if (currentNotification) {
      dismissNotification(currentNotification.id);
      setCurrentNotification(null);
      queryClient.invalidateQueries({ queryKey: ['high-priority-notifications'] });
    }
  };

  const handleViewNow = () => {
    if (currentNotification) {
      markAsRead(currentNotification.id);
      setCurrentNotification(null);
      queryClient.invalidateQueries({ queryKey: ['high-priority-notifications'] });
    }
  };

  if (!currentNotification) {
    return null;
  }

  return (
    <HighPriorityModal
      notification={currentNotification}
      onDismiss={handleDismiss}
      onViewNow={handleViewNow}
    />
  );
}
