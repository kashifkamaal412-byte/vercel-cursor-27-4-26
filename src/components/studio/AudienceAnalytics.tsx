import { Globe, Users, Clock } from "lucide-react";
import { AudienceData } from "@/hooks/useCreatorAnalytics";

interface AudienceAnalyticsProps {
  data: AudienceData;
}

export const AudienceAnalytics = ({ data }: AudienceAnalyticsProps) => {
  const totalCountry = data.countries.reduce((sum, c) => sum + c.count, 0);
  const totalGender = data.genderSplit.reduce((sum, g) => sum + g.count, 0);
  
  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;
    return `${h}${ampm}`;
  };

  const peakHour = data.peakHours.reduce((peak, h) => 
    (!peak || h.count > peak.count) ? h : peak, 
    null as { hour: number; count: number } | null
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        Audience Analytics
      </h3>

      {/* Countries */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Top Countries</h4>
        <div className="space-y-2">
          {data.countries.slice(0, 5).map((country) => (
            <div key={country.country} className="flex items-center gap-3">
              <span className="text-sm flex-1">{country.country}</span>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                  style={{ width: `${(country.count / totalCountry) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {Math.round((country.count / totalCountry) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Age Groups */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          Age Distribution
        </h4>
        <div className="flex gap-2 items-end h-24">
          {data.ageGroups.map((age) => {
            const maxCount = Math.max(...data.ageGroups.map((a) => a.count));
            const height = (age.count / maxCount) * 100;
            return (
              <div key={age.age_group} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-gradient-to-t from-accent to-accent/50 rounded-t-md transition-all duration-500"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-muted-foreground">{age.age_group}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gender Split */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Gender Split</h4>
        <div className="flex gap-2 h-4 rounded-full overflow-hidden">
          {data.genderSplit.map((gender, i) => {
            const colors = ["bg-primary", "bg-accent", "bg-secondary"];
            return (
              <div
                key={gender.gender}
                className={`${colors[i % 3]} transition-all duration-500`}
                style={{ width: `${(gender.count / totalGender) * 100}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs">
          {data.genderSplit.map((gender, i) => {
            const colors = ["text-primary", "text-accent", "text-secondary"];
            return (
              <span key={gender.gender} className={colors[i % 3]}>
                {gender.gender}: {Math.round((gender.count / totalGender) * 100)}%
              </span>
            );
          })}
        </div>
      </div>

      {/* Peak Hours */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Peak Watch Times
        </h4>
        {peakHour && (
          <div className="text-center mb-3">
            <span className="text-2xl font-bold gradient-text">{formatHour(peakHour.hour)}</span>
            <p className="text-xs text-muted-foreground">Most active time</p>
          </div>
        )}
        <div className="flex gap-1 items-end h-16">
          {data.peakHours.map((h) => {
            const maxCount = Math.max(...data.peakHours.map((ph) => ph.count));
            const height = (h.count / maxCount) * 100;
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-primary/80 to-primary/30 rounded-t-sm transition-all duration-500"
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>9AM</span>
          <span>3PM</span>
          <span>9PM</span>
        </div>
      </div>
    </div>
  );
};
