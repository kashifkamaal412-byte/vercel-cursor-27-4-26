import { useEffect } from "react";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Component that initializes global presence tracking
 * Place this high in the component tree (e.g., in App.tsx)
 */
export const PresenceTracker = () => {
  const { user } = useAuth();
  
  // Initialize presence tracking when user is logged in
  usePresence();
  
  return null;
};
