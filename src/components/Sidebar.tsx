"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  BookOpen,
  Settings,
  Sun,
  Moon,
  LogIn,
  LogOut,
  X,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "strategies", label: "Strategies", icon: BarChart3, path: "/strategies" },
  { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts" },
  { id: "journal", label: "Trade Journal", icon: BookOpen, path: "/journal" },
];

const settingsItem = { id: "settings", label: "Settings", icon: Settings, path: "/settings" };

const NavLink = ({ item, isMobile }: { item: typeof navItems[0], isMobile: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(item.path);

  const linkContent = (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className="w-full justify-start"
      size={isMobile ? "default" : "icon"}
    >
      <item.icon className={cn("h-5 w-5", isMobile && "mr-4")} />
      <span className={cn(!isMobile && "sr-only")}>{item.label}</span>
    </Button>
  );

  if (isMobile) {
    return <Link to={item.path} className="block">{linkContent}</Link>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to={item.path}>{linkContent}</Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { theme, setTheme } = useTheme();
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile, setIsOpen]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const SidebarContent = ({ isMobile }: { isMobile: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-6 w-6" />
          <span className={cn(!isMobile && "sr-only")}>TradeRadar</span>
        </Link>
        {isMobile && (
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close Menu</span>
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start gap-1 p-2 text-sm font-medium">
          {navItems.map((item) => <NavLink key={item.id} item={item} isMobile={isMobile} />)}
        </nav>
      </div>
      <div className="mt-auto border-t p-2">
        <nav className="grid items-start gap-1 text-sm font-medium">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  size={isMobile ? "default" : "icon"}
                  onClick={toggleTheme}
                >
                  <Sun className={cn("h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0", isMobile && "mr-4")} />
                  <Moon className={cn("absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100", isMobile && "mr-4")} />
                  <span className={cn(!isMobile && "sr-only")}>Toggle Theme</span>
                </Button>
              </TooltipTrigger>
              {!isMobile && <TooltipContent side="right">Toggle Theme</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
          <NavLink item={settingsItem} isMobile={isMobile} />
          <Separator className="my-1" />
          {loading ? (
            <div className="flex h-9 w-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : user ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size={isMobile ? "default" : "icon"}
                    onClick={signOut}
                  >
                    <LogOut className={cn("h-5 w-5", isMobile && "mr-4")} />
                    <span className={cn(!isMobile && "sr-only")}>Logout</span>
                  </Button>
                </TooltipTrigger>
                {!isMobile && <TooltipContent side="right">Logout ({user.email})</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size={isMobile ? "default" : "icon"}
                    onClick={signInWithGoogle}
                  >
                    <LogIn className={cn("h-5 w-5", isMobile && "mr-4")} />
                    <span className={cn(!isMobile && "sr-only")}>Login</span>
                  </Button>
                </TooltipTrigger>
                {!isMobile && <TooltipContent side="right">Login with Google</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          )}
        </nav>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsOpen(false)}
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 border-r bg-background transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent isMobile={true} />
        </aside>
      </>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <SidebarContent isMobile={false} />
    </aside>
  );
};

export default Sidebar;