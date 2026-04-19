import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationBellProps {
  onClick: () => void;
}

export const NotificationBell = ({ onClick }: NotificationBellProps) => {
  const { unreadCount } = useNotifications();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
};
