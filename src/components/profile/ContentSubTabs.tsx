import { useState } from "react";
import { Grid3X3, Film, FileText } from "lucide-react";

export type SubTabId = "shorts" | "long" | "posts";

interface SubTab {
  id: SubTabId;
  label: string;
  icon: React.ElementType;
  count: number;
}

interface ContentSubTabsProps {
  tabs: SubTab[];
  activeTab: SubTabId;
  onTabChange: (tab: SubTabId) => void;
}

export const ContentSubTabs = ({ tabs, activeTab, onTabChange }: ContentSubTabsProps) => (
  <div className="flex items-center gap-1 px-4 py-2 bg-muted/30">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          activeTab === tab.id
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
        }`}
      >
        <tab.icon className="w-3 h-3" />
        {tab.label}
        {tab.count > 0 && (
          <span className={`text-[10px] px-1 rounded-full ${
            activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
          }`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export const getVideoSubTabs = (shortsCount: number, longCount: number): SubTab[] => [
  { id: "shorts", label: "Shorts", icon: Grid3X3, count: shortsCount },
  { id: "long", label: "Long Videos", icon: Film, count: longCount },
];

export const getFullSubTabs = (shortsCount: number, longCount: number, postsCount: number): SubTab[] => [
  { id: "shorts", label: "Shorts", icon: Grid3X3, count: shortsCount },
  { id: "long", label: "Long Videos", icon: Film, count: longCount },
  { id: "posts", label: "Posts", icon: FileText, count: postsCount },
];
