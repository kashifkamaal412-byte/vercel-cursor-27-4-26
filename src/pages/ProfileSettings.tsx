import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  HelpCircle,
  Info,
  ChevronRight,
  Edit,
  Lock,
  Palette,
  Bot,
  LogOut,
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PrivacySecuritySettings from "@/components/settings/PrivacySecuritySettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import HelpSupportChat from "@/components/settings/HelpSupportChat";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import AboutSettings from "@/components/settings/AboutSettings";
import { toast } from "sonner";

type SettingsView = "main" | "privacy" | "notifications" | "help" | "appearance" | "about";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [currentView, setCurrentView] = useState<SettingsView>("main");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);

  // Admin check
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
    };

    checkAdmin();
  }, [user]);

  // Safe redirect
  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      setLoadingLogout(true);
      await signOut();
      toast.success("You have been logged out successfully.");
      navigate("/");
    } catch (error) {
      toast.error("Logout failed. Try again.");
    } finally {
      setLoadingLogout(false);
      setShowLogoutModal(false);
    }
  };

  const settingsOptions = [
    {
      id: "edit-profile",
      icon: Edit,
      label: "Edit Profile",
      description: "Update your name, bio, and photo",
      onClick: () => navigate("/profile/edit"),
      color: "text-primary",
    },
    {
      id: "privacy-security",
      icon: Shield,
      label: "Privacy & Security",
      description: "Control who can see your content",
      onClick: () => setCurrentView("privacy"),
      color: "text-secondary",
    },
    {
      id: "notifications",
      icon: Bell,
      label: "Notifications",
      description: "Manage your notification preferences",
      onClick: () => setCurrentView("notifications"),
      color: "text-accent",
    },
    {
      id: "appearance",
      icon: Palette,
      label: "Appearance",
      description: "Theme and display settings",
      onClick: () => setCurrentView("appearance"),
      color: "text-primary",
    },
    {
      id: "help",
      icon: HelpCircle,
      label: "Help & Support",
      description: "Get help or report a problem",
      onClick: () => setCurrentView("help"),
      color: "text-muted-foreground",
    },
    {
      id: "about",
      icon: Info,
      label: "About",
      description: "App version and legal info",
      onClick: () => setCurrentView("about"),
      color: "text-muted-foreground",
    },
  ];

  return (
    <MainLayout>
      <AnimatePresence mode="wait">
        {currentView === "privacy" ? (
          <PrivacySecuritySettings onBack={() => setCurrentView("main")} />
        ) : currentView === "notifications" ? (
          <NotificationSettings onBack={() => setCurrentView("main")} />
        ) : currentView === "help" ? (
          <HelpSupportChat onBack={() => setCurrentView("main")} />
        ) : currentView === "appearance" ? (
          <AppearanceSettings onBack={() => setCurrentView("main")} />
        ) : currentView === "about" ? (
          <AboutSettings onBack={() => setCurrentView("main")} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen pb-20"
          >
            {/* Header */}
            <div className="p-4 flex items-center gap-3 border-b border-glass-border">
              <Button variant="ghost" size="icon-sm" onClick={() => navigate("/profile")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">Settings</h1>
            </div>

            {/* User Info */}
            <div className="p-4">
              <div className="p-4 rounded-2xl glass flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Your Account</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
                <Lock className="w-5 h-5 text-primary" />
              </div>
            </div>

            {/* Settings Options */}
            <div className="px-4 space-y-2">
              {settingsOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={option.onClick}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full bg-background/50 flex items-center justify-center ${option.color}`}
                  >
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              ))}
            </div>

            {/* Logout */}
            <div className="mt-6 px-4">
              <Button variant="destructive" className="w-full gap-2" onClick={() => setShowLogoutModal(true)}>
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-4 px-4 text-center">
              <p className="text-xs text-muted-foreground">Your account is secure and your data is protected</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-xl w-80 shadow-lg">
            <h3 className="text-lg font-semibold">Are you sure you want to log out?</h3>
            <p className="text-sm text-muted-foreground mt-2">You will need to sign in again to access your account.</p>

            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleLogout} disabled={loadingLogout}>
                {loadingLogout ? "Logging out..." : "Yes, Log Out"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ProfileSettings;
