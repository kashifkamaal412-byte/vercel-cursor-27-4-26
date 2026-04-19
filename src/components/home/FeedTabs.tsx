import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Video } from "@/hooks/useVideos";
import { useNavigate } from "react-router-dom";

type TabType = "trending" | "foryou";

interface FeedTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  currentVideo?: Video | null;
  onShareClick?: () => void;
}

const tabs: { id: TabType; label: string }[] = [
  { id: "trending", label: "Following" },
  { id: "foryou", label: "For You" },
];

export const FeedTabs = ({ activeTab, onTabChange }: FeedTabsProps) => {
  const navigate = useNavigate();

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pt-2 px-4 safe-area-inset-top md:left-1/2 md:-translate-x-1/2 md:max-w-[420px]">
      <div className="flex items-center justify-between">
        <div className="w-8" />
        <div className="flex items-center gap-3">
          {tabs.map((tab, index) => (
            <div key={tab.id} className="flex items-center gap-3">
              <button
                onClick={() => onTabChange(tab.id)}
                className="relative px-1 py-1"
              >
                <span
                  className={`text-xs font-medium transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-white text-glow"
                      : "text-white/50"
                  }`}
                >
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                  />
                )}
              </button>
              {index < tabs.length - 1 && (
                <div className="w-px h-3 bg-white/20" />
              )}
            </div>
          ))}
        </div>
        <button aria-label="Search" onClick={() => navigate("/discover")} className="p-2 -mr-2">
          <Search className="w-5 h-5 text-white/80" />
        </button>
      </div>
    </div>
  );
};
