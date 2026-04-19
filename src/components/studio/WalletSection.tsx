import { Wallet, TrendingUp, Gift, Video, BarChart3 } from "lucide-react";
import { WalletData } from "@/hooks/useCreatorAnalytics";

interface WalletSectionProps {
  data: WalletData;
}

export const WalletSection = ({ data }: WalletSectionProps) => {
  const giftIcons: Record<string, string> = {
    heart: "❤️",
    diamond: "💎",
    star: "⭐",
    fire: "🔥",
    crown: "👑",
    rocket: "🚀",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        Wallet & Earnings
      </h3>

      {/* Total Balance Card */}
      <div className="glass rounded-xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative">
          <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
          <p className="text-4xl font-bold gradient-text">${data.totalBalance.toFixed(2)}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-green-400">
            <TrendingUp className="w-3 h-3" />
            <span>Updated in real-time</span>
          </div>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <Video className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-semibold">${data.videoEarnings.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Videos</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Gift className="w-5 h-5 mx-auto mb-1 text-accent" />
          <p className="text-lg font-semibold">${data.giftEarnings.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Gifts</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-1 text-secondary" />
          <p className="text-lg font-semibold">${data.adsEarnings.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Ads</p>
        </div>
      </div>

      {/* Gift Insights */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-accent" />
          Gift Insights
        </h4>

        {data.topGiftVideo && (
          <div className="mb-3 p-3 bg-accent/10 rounded-lg">
            <p className="text-xs text-muted-foreground">Top Gifted Video</p>
            <p className="text-sm font-medium truncate">{data.topGiftVideo.caption}</p>
            <p className="text-lg font-bold text-accent">{data.topGiftVideo.gift_count} gifts</p>
          </div>
        )}

        {data.giftsList.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Gifts Received</p>
            <div className="flex flex-wrap gap-2">
              {data.giftsList.map((gift) => (
                <div 
                  key={gift.gift_type}
                  className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full text-sm"
                >
                  <span>{giftIcons[gift.gift_type] || "🎁"}</span>
                  <span className="font-medium">{gift.count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No gifts received yet
          </p>
        )}
      </div>

      {/* Ads Earnings Detail */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-secondary" />
          Ads Revenue
        </h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">${data.adsEarnings.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">From video ads</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-400">+$0.00</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
        </div>
      </div>
    </div>
  );
};
