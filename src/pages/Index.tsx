import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { RealVideoFeed } from "@/components/video/RealVideoFeed";
import { FeedTabs } from "@/components/home/FeedTabs";
import { useVideos } from "@/hooks/useVideos";
import { useIsMobile } from "@/hooks/use-mobile";

type TabType = "trending" | "foryou";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("foryou");
  const isMobile = useIsMobile();
  
  const { videos, loading } = useVideos("foryou", "short");

  return (
    <MainLayout>
      <div className="relative h-screen md:h-[calc(100vh-56px)] bg-black">
        <div className={isMobile ? "h-full" : "h-full flex items-stretch justify-center bg-black"}>
          <div className={isMobile ? "h-full" : "relative h-full w-full max-w-[420px] border-x border-border/10"}>
            <FeedTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />
            <RealVideoFeed 
              videos={videos} 
              loading={loading} 
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
