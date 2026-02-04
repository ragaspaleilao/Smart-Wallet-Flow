import { ReactNode } from "react";
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
  Briefcase
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
  { icon: Briefcase, label: "Negócio", path: "/business" },
];

interface ResponsiveLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

function DesktopSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col z-50">
      <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-green-500 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-green-500 bg-clip-text text-transparent">
              Xô Preguiça
            </h1>
            <p className="text-xs text-gray-500">Finanças Pessoais</p>
          </div>
        </div>
      </div>

      {user && (
        <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {user.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt={user.firstName || ""} 
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-green-500 flex items-center justify-center text-white font-semibold">
                {user.firstName?.[0] || user.email?.[0] || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Menu principal">
        {sidebarItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 no-underline",
                isActive
                  ? "bg-gradient-to-r from-purple-500/10 to-green-500/10 text-purple-600 dark:text-purple-400 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
              )}
              aria-current={isActive ? "page" : undefined}
              data-testid={`nav-${item.path.replace("/", "")}`}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-purple-600")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-zinc-800 space-y-1">
        <Link 
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 no-underline"
        >
          <Settings className="w-5 h-5" />
          <span>Configurações</span>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}

export function ResponsiveLayout({ children, showNav = true }: ResponsiveLayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  
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
      {shouldShowNav && <DesktopSidebar />}
      <main className={cn(
        "min-h-screen bg-white dark:bg-zinc-950",
        shouldShowNav ? "ml-64" : ""
      )}>
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export { ResponsiveLayout as MobileLayout };
