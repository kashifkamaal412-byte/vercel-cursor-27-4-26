import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UploadProvider } from "@/contexts/UploadContext";
import { GiftAnimationProvider } from "@/contexts/GiftAnimationContext";
import { PremiumGiftVideoOverlay } from "@/components/gifts/PremiumGiftVideoOverlay";
import { FloatingUploadWidget } from "@/components/upload/FloatingUploadWidget";
import { PresenceTracker } from "@/components/PresenceTracker";
import { ProtectedAdminRoute } from "@/components/auth/ProtectedAdminRoute";
import { PremiumLoader } from "@/components/ui/PremiumLoader";
import { ThemeProvider, initializeTheme } from "@/contexts/ThemeContext";

// Eagerly loaded - critical for initial render
import Index from "./pages/Index";

// Lazy loaded - not needed on initial page load
const Discover = lazy(() => import("./pages/Discover"));
const Create = lazy(() => import("./pages/Create"));
const Messages = lazy(() => import("./pages/Messages"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const LongVideos = lazy(() => import("./pages/LongVideos"));
const Live = lazy(() => import("./pages/Live"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreatorStudio = lazy(() => import("./pages/CreatorStudio"));
const AdminControlRoom = lazy(() => import("./pages/AdminControlRoom"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Posts = lazy(() => import("./pages/Posts"));
const SoundStudio = lazy(() => import("./pages/SoundStudio"));

// Premium loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <PremiumLoader text="Loading..." />
  </div>
);

initializeTheme();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PresenceTracker />
            <UploadProvider>
              <GiftAnimationProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/posts" element={<Posts />} />
                    <Route path="/sounds" element={<SoundStudio />} />
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/create" element={<Create />} />
                    <Route path="/long-videos" element={<LongVideos />} />
                    <Route path="/live" element={<Live />} />
                    <Route path="/studio" element={<CreatorStudio />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/chat/:recipientId" element={<Chat />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/edit" element={<EditProfile />} />
                    <Route path="/profile/settings" element={<ProfileSettings />} />
                    <Route path="/profile/:userId" element={<UserProfile />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/admin-control" element={<ProtectedAdminRoute><AdminControlRoom /></ProtectedAdminRoute>} />
                    <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                {/* Global gift video overlay - works on ALL pages */}
                <PremiumGiftVideoOverlay />
                <FloatingUploadWidget />
              </GiftAnimationProvider>
            </UploadProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
