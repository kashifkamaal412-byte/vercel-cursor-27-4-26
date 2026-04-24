import { Home, Film, Radio, ImageIcon, Search, User, Plus, Compass, MessageSquare, Bell, Settings, TrendingUp, Inbox, Music2 } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useNotifications";

const mainNav = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Compass, label: "Discover", path: "/discover" },
  { icon: Film, label: "Long Videos", path: "/long-videos" },
  { icon: ImageIcon, label: "Posts", path: "/posts" },
  { icon: Radio, label: "Live", path: "/live" },
];

const secondaryNav = [
  { icon: MessageSquare, label: "Messages", path: "/messages" },
  { icon: Music2, label: "Sounds", path: "/sounds" },
  { icon: TrendingUp, label: "Studio", path: "/studio" },
];

export const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] xl:w-[240px] bg-card/80 backdrop-blur-xl border-r border-border/30 z-40 flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-border/20">
        <h1 className="text-lg font-bold gradient-text tracking-tight">Profit Media</h1>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {mainNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <item.icon
                className={`w-5 h-5 transition-all ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </NavLink>
          );
        })}

        {/* Create Button */}
        <NavLink
          to="/create"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium gradient-primary text-primary-foreground mt-3 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" strokeWidth={2.2} />
          <span>Create</span>
        </NavLink>

        {/* Divider */}
        <div className="my-4 border-t border-border/20" />

        {/* Secondary Nav */}
        {secondaryNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Divider */}
        <div className="my-4 border-t border-border/20" />

        {/* Notification */}
        {user && (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 group w-full"
          >
            <div className="relative">
              <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground" strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </button>
        )}

        {/* Settings */}
        {user && (
          <NavLink
            to="/profile/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/profile/settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Settings className="w-5 h-5" strokeWidth={1.8} />
            <span>Settings</span>
          </NavLink>
        )}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-border/20">
        {user ? (
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-muted">
                {profile?.display_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.display_name || "User"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                @{profile?.username || "user"}
              </p>
            </div>
          </NavLink>
        ) : (
          <NavLink
            to="/auth"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <User className="w-4 h-4" />
            Sign In
          </NavLink>
        )}
      </div>
    </aside>
  );
};
