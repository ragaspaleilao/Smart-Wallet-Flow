import { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { useLocation } from "wouter";

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function MobileLayout({ children, showNav = true }: MobileLayoutProps) {
  const [location] = useLocation();
  
  // Hide nav on onboarding and permissions
  const isFullScreen = location === "/" || location === "/permissions" || location === "/voice-entry" || location === "/photo-entry";
  const shouldShowNav = showNav && !isFullScreen;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex justify-center overflow-x-hidden">
      <div className="w-full max-w-md bg-white dark:bg-black min-h-screen relative shadow-2xl flex flex-col">
        <main className={`flex-1 flex flex-col ${shouldShowNav ? "pb-20" : ""}`}>
          {children}
        </main>
        {shouldShowNav && <BottomNav />}
      </div>
    </div>
  );
}
