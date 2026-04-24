import { Plus, User, Film, Radio, Home, ImageIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [{
  icon: Home,
  label: "Home",
  path: "/",
  isHome: true
}, {
  icon: Film,
  label: "Long",
  path: "/long-videos"
}, {
  icon: Plus,
  label: "Create",
  path: "/create",
  isCreate: true
}, {
  icon: ImageIcon,
  label: "Post",
  path: "/posts"
}, {
  icon: Radio,
  label: "Live",
  path: "/live"
}, {
  icon: User,
  label: "Profile",
  path: "/profile"
}];

// Pages where the bottom nav overlays dark video content
const darkOverlayPages = ["/", "/long-videos"];

export const BottomNav = () => {
  const location = useLocation();
  const isDarkOverlay = darkOverlayPages.includes(location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      {/* Dark overlay style for video pages, themed style for other pages */}
      <div className={`absolute inset-0 backdrop-blur-2xl border-t ${
        isDarkOverlay
          ? "bg-black/60 border-white/5"
          : "bg-background/90 border-border/30"
      }`} />
      
      <div className="relative flex items-center justify-around h-14 max-w-lg mx-auto px-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path} className="flex flex-col items-center justify-center flex-1 h-full">
              {item.isCreate ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <div className={`rounded-lg p-2 shadow-lg ${
                    isDarkOverlay
                      ? "bg-white shadow-white/10"
                      : "bg-primary shadow-primary/20"
                  }`}>
                    <item.icon className={`w-5 h-5 ${isDarkOverlay ? "text-black" : "text-primary-foreground"}`} strokeWidth={2} />
                  </div>
                </motion.div>
              ) : (
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center gap-0.5">
                  <item.icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      isDarkOverlay
                        ? (isActive ? "text-white" : "text-white/50")
                        : (isActive ? "text-foreground" : "text-muted-foreground")
                    }`}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span className={`text-[9px] font-medium transition-all duration-200 ${
                    isDarkOverlay
                      ? (isActive ? "text-white" : "text-white/40")
                      : (isActive ? "text-foreground" : "text-muted-foreground/70")
                  }`}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
