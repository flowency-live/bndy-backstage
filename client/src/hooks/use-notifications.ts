import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationsService,
  type Notification,
} from '@/lib/services/notifications-service';

export function useNotifications(artistId?: string, enabled = true) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications', artistId],
    queryFn: () => notificationsService.getNotifications(artistId),
    enabled,
    refetchInterval: 60000, // 60 seconds
    refetchIntervalInBackground: false,
    staleTime: 30000, // 30 seconds
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: (artistIdParam?: string) =>
      notificationsService.markAllAsRead(artistIdParam),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.dismissNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    dismissNotification: dismissMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
    isDismissing: dismissMutation.isPending,
  };
}
