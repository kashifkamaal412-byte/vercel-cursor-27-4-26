import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopTopBar } from "./DesktopTopBar";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export const MainLayout = ({ children, hideNav = false }: MainLayoutProps) => {
  const isMobile = useIsMobile();

  // Desktop layout (>= 768px)
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {!hideNav && <DesktopSidebar />}
        <div className={!hideNav ? "ml-[220px] xl:ml-[240px]" : ""}>
          {!hideNav && <DesktopTopBar />}
          <main>{children}</main>
        </div>
      </div>
    );
  }

  // Mobile layout (< 768px)
  return (
    <div className="min-h-screen bg-background">
      <main className={`${hideNav ? "" : "pb-20"}`}>{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
};
