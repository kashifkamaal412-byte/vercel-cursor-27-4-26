import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Check, XCircle, Mic, MicOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useLiveStream } from "@/hooks/useLiveStream";

interface Guest {
  id: string;
  user_id: string;
  status: string;
  slot_position: number;
  user_name?: string;
  user_avatar?: string;
}

interface MultiGuestPanelProps {
  streamId: string;
  onClose: () => void;
  isCreator?: boolean;
}

export const MultiGuestPanel = ({ streamId, onClose, isCreator }: MultiGuestPanelProps) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const { updateGuestStatus, requestToJoinAsGuest } = useLiveStream();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("live_guests")
        .select("*")
        .eq("stream_id", streamId);

      if (data) {
        const userIds = data.map((g: any) => g.user_id);
        const { data: profiles } = await supabase.from("public_profile_view").select("user_id, display_name, username, avatar_url").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        setGuests(data.map((g: any) => ({
          ...g,
          user_name: profileMap.get(g.user_id)?.display_name || profileMap.get(g.user_id)?.username || "Guest",
          user_avatar: profileMap.get(g.user_id)?.avatar_url,
        })));
      }
    };
    fetch();

    const channel = supabase
      .channel(`guests-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_guests", filter: `stream_id=eq.${streamId}` }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const activeGuests = guests.filter(g => g.status === "accepted");
  const pendingGuests = guests.filter(g => g.status === "pending");

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="absolute bottom-0 left-0 right-0 z-40 bg-card rounded-t-2xl max-h-[60vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <h3 className="font-bold text-foreground">
          Guests ({activeGuests.length}/4)
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Active Guests */}
      {activeGuests.length > 0 && (
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase">On Stage</p>
          {activeGuests.map(g => (
            <div key={g.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={g.user_avatar || ""} />
                  <AvatarFallback>{(g.user_name || "G")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{g.user_name}</p>
                  <p className="text-xs text-green-400">On stage</p>
                </div>
              </div>
              {isCreator && (
                <Button size="sm" variant="destructive" onClick={() => updateGuestStatus(g.id, "removed")}>
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests */}
      {isCreator && pendingGuests.length > 0 && (
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Requests</p>
          {pendingGuests.map(g => (
            <div key={g.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={g.user_avatar || ""} />
                  <AvatarFallback>{(g.user_name || "G")[0]}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold text-foreground">{g.user_name}</p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="w-8 h-8 text-green-400 border-green-400/30" onClick={() => updateGuestStatus(g.id, "accepted")}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" className="w-8 h-8 text-red-400 border-red-400/30" onClick={() => updateGuestStatus(g.id, "rejected")}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeGuests.length === 0 && pendingGuests.length === 0 && (
        <div className="p-8 text-center">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No guests yet. Viewers can request to join.</p>
        </div>
      )}
    </motion.div>
  );
};
