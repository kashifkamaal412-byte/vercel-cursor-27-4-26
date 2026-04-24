import { Activity, UserPlus, Heart, Gift } from "lucide-react";
import { ActivityData } from "@/hooks/useCreatorAnalytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ActivityInsightsProps {
  data: ActivityData;
}

export const ActivityInsights = ({ data }: ActivityInsightsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Activity Insights
      </h3>

      {/* Recent Followers */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-accent" />
          New Fans
        </h4>
        {data.recentFollowers.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto hide-scrollbar">
            {data.recentFollowers.map((follower, i) => (
              <div key={`${follower.user_id}-${i}`} className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={follower.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {follower.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{follower.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(follower.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className="text-xs text-accent">+1 Fan</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No new fans yet
          </p>
        )}
      </div>

      {/* Recent Likes */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-destructive" />
          Recent Likes
        </h4>
        {data.recentLikes.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto hide-scrollbar">
            {data.recentLikes.map((like, i) => (
              <div key={`${like.user_id}-${i}`} className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={like.avatar_url} />
                  <AvatarFallback className="bg-destructive/20 text-destructive text-xs">
                    {like.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{like.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Liked "{like.video_caption}"
                  </p>
                </div>
                <Heart className="w-4 h-4 text-destructive fill-destructive" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent likes
          </p>
        )}
      </div>

      {/* Recent Gifts */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-secondary" />
          Recent Gifts
        </h4>
        {data.recentGifts.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto hide-scrollbar">
            {data.recentGifts.map((gift, i) => {
              const giftEmojis: Record<string, string> = {
                heart: "❤️",
                diamond: "💎",
                star: "⭐",
                fire: "🔥",
                crown: "👑",
                rocket: "🚀",
              };
              return (
                <div key={`${gift.user_id}-${i}`} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={gift.avatar_url} />
                    <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                      {gift.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{gift.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Sent gift on "{gift.video_caption}"
                    </p>
                  </div>
                  <span className="text-lg">{giftEmojis[gift.gift_type] || "🎁"}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No gifts received yet
          </p>
        )}
      </div>
    </div>
  );
};
