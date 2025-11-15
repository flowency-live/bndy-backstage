import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/lib/services/notifications-service';
import { HighPriorityModal } from './high-priority-modal';
import { useNotifications } from '@/hooks/use-notifications';
import { useServerAuth } from '@/hooks/useServerAuth';

export function HighPriorityNotificationHandler() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useServerAuth();
  const { dismissNotification, markAsRead } = useNotifications(undefined, isAuthenticated);
  const [currentNotification, setCurrentNotification] = useState<any>(null);

  const { data: highPriorityNotifications } = useQuery({
    queryKey: ['high-priority-notifications'],
    queryFn: () => notificationsService.getHighPriorityNotifications(),
    enabled: isAuthenticated,
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

  const handleDismiss = async () => {
    if (currentNotification) {
      setCurrentNotification(null);
      await dismissNotification(currentNotification.id);
      queryClient.invalidateQueries({ queryKey: ['high-priority-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  const handleViewNow = async () => {
    if (currentNotification) {
      setCurrentNotification(null);
      await markAsRead(currentNotification.id);
      queryClient.invalidateQueries({ queryKey: ['high-priority-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
