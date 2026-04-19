import { TrendingUp, Eye, Users, Heart, Gift, DollarSign } from "lucide-react";
import { SevenDaySummary as SevenDaySummaryType } from "@/hooks/useCreatorAnalytics";

interface SevenDaySummaryProps {
  data: SevenDaySummaryType;
}

export const SevenDaySummary = ({ data }: SevenDaySummaryProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const maxViews = Math.max(...data.views.map((v) => v.count), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Last 7 Days Summary
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <Eye className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-sm font-bold">{data.totalViews.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Views</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Users className="w-4 h-4 mx-auto mb-1 text-accent" />
          <p className="text-sm font-bold">+{data.totalFollowers}</p>
          <p className="text-xs text-muted-foreground">Fans</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Heart className="w-4 h-4 mx-auto mb-1 text-destructive" />
          <p className="text-sm font-bold">{data.totalLikes}</p>
          <p className="text-xs text-muted-foreground">Likes</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Gift className="w-4 h-4 mx-auto mb-1 text-secondary" />
          <p className="text-sm font-bold">{data.totalGifts}</p>
          <p className="text-xs text-muted-foreground">Gifts</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <DollarSign className="w-4 h-4 mx-auto mb-1 text-green-400" />
          <p className="text-sm font-bold">${data.totalEarnings.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </div>
      </div>

      {/* Views Chart */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-4 text-muted-foreground">Daily Views</h4>
        <div className="flex items-end gap-1 h-24">
          {data.views.map((v, i) => {
            const height = (v.count / maxViews) * 100;
            return (
              <div key={v.date} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full rounded-t-md transition-all duration-500 relative group"
                  style={{ 
                    height: `${height}%`,
                    background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.5))`
                  }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card px-2 py-0.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {v.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {data.views.map((v) => (
            <span key={v.date} className="text-xs text-muted-foreground">
              {formatDate(v.date)}
            </span>
          ))}
        </div>
      </div>

      {/* Growth Indicators */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Followers Growth</span>
            <span className="text-green-400 text-xs">↑ {data.totalFollowers}</span>
          </div>
          <div className="flex gap-0.5 items-end h-8">
            {data.followers.map((f) => {
              const maxF = Math.max(...data.followers.map((ff) => ff.count), 1);
              const height = (f.count / maxF) * 100;
              return (
                <div 
                  key={f.date}
                  className="flex-1 bg-accent/60 rounded-t-sm"
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Earnings Trend</span>
            <span className="text-green-400 text-xs">+${data.totalEarnings.toFixed(2)}</span>
          </div>
          <div className="flex gap-0.5 items-end h-8">
            {data.earnings.map((e) => {
              const maxE = Math.max(...data.earnings.map((ee) => ee.amount), 1);
              const height = (e.amount / maxE) * 100;
              return (
                <div 
                  key={e.date}
                  className="flex-1 bg-green-500/60 rounded-t-sm"
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
