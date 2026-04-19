import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RequestActionsProps {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  onActionComplete: () => void;
}

export const RequestActions = ({
  conversationId,
  otherUserId,
  otherUserName,
  onActionComplete
}: RequestActionsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setLoading("accept");
    try {
      // Update conversation status to accepted
      const { error: convError } = await supabase
        .from("conversations")
        .update({ status: 'accepted' })
        .eq("id", conversationId);

      if (convError) throw convError;

      // Optionally follow the user back (ignore errors)
      try {
        await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: otherUserId
          });
      } catch {
        // Ignore duplicate errors
      }

      toast.success(`Accepted ${otherUserName}'s message request`);
      onActionComplete();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error accepting request:", error);
      toast.error("Failed to accept request");
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setLoading("decline");
    try {
      // Delete all messages in the conversation first
      await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);

      // Delete the conversation
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      toast.success("Request declined");
      onActionComplete();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error declining request:", error);
      toast.error("Failed to decline request");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDecline}
        disabled={loading !== null}
        className="h-8 w-8 p-0 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive"
      >
        {loading === "decline" ? (
          <div className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleAccept}
        disabled={loading !== null}
        className="h-8 w-8 p-0 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
      >
        {loading === "accept" ? (
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};
