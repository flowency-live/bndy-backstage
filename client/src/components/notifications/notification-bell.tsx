import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationPopover } from './notification-popover';
import { useNotifications } from '@/hooks/use-notifications';
import { useServerAuth } from '@/hooks/useServerAuth';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useServerAuth();
  const { unreadCount } = useNotifications(undefined, isAuthenticated);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs bg-cyan-500 text-white border-0 hover:bg-cyan-600"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-screen max-w-[calc(100vw-2rem)] sm:w-96 p-0"
      >
        <NotificationPopover onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
