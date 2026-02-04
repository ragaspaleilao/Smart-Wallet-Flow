import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/mock-data";
import { 
  Wallet, 
  Settings, 
  LogOut,
  TrendingUp,
  Car,
  Bot,
  Repeat,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNav } from "./bottom-nav";

const sidebarItems = [
  ...navItems,
  { icon: TrendingUp, label: "Investimentos", path: "/investments" },
  { icon: Car, label: "Veículos", path: "/vehicles" },
  { icon: Repeat, label: "Assinaturas", path: "/subscriptions" },
  { icon: Bot, label: "Mentor IA", path: "/ai-chat" },
];

interface ResponsiveLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

function DesktopSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <aside className={cn(
      "fixed left-0 top-0 bottom-0 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col z-50 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-green-500 bg-clip-text text-transparent">
                  Xô Preguiça
                </h1>
                <p className="text-xs text-gray-500">Finanças Pessoais</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className={cn(
              "p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 transition-colors",
              collapsed && "absolute right-2 top-4"
            )}
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto" role="navigation" aria-label="Menu principal">
        {sidebarItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 no-underline",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-gradient-to-r from-purple-500/10 to-green-500/10 text-purple-600 dark:text-purple-400 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
              )}
              aria-current={isActive ? "page" : undefined}
              data-testid={`nav-${item.path.replace("/", "")}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-purple-600")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-zinc-800 space-y-1">
        <Link 
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 no-underline",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Configurações" : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </Link>
        <button
          onClick={() => logout()}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer",
            collapsed && "justify-center px-0"
          )}
          data-testid="button-logout"
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}

export function ResponsiveLayout({ children, showNav = true }: ResponsiveLayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const isFullScreen = location === "/permissions" || location === "/voice-entry" || location === "/photo-entry";
  const shouldShowNav = showNav && !isFullScreen;

  if (isMobile) {
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

  if (isFullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {shouldShowNav && <DesktopSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />}
      <main className={cn(
        "min-h-screen bg-white dark:bg-zinc-950 transition-all duration-300",
        shouldShowNav ? (sidebarCollapsed ? "ml-16" : "ml-64") : ""
      )}>
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export { ResponsiveLayout as MobileLayout };
