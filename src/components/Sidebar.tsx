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
  UserCircle,
  X
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { theme, setTheme } = useTheme();
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile, setIsOpen]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "strategies", label: "Strategies", icon: BarChart3, path: "/strategies" },
    { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts" },
    { id: "journal", label: "Trade Journal", icon: BookOpen, path: "/journal" },
  ];

  const bottomNavItems = [
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const NavLink = ({ item }: { item: typeof navItems[0] }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={item.path}>
          <Button
            variant={location.pathname.startsWith(item.path) ? "secondary" : "ghost"}
            className="w-full justify-center sm:justify-start"
            size="icon"
          >
            <item.icon className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only sm:ml-4">{item.label}</span>
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="hidden sm:block">{item.label}</TooltipContent>
    </Tooltip>
  );

  const SidebarContent = () => (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-6 w-6" />
          <span className="">TradeRadar</span>
        </Link>
        <Button variant="outline" size="icon" className="ml-auto h-8 w-8 sm:hidden" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close Menu</span>
        </Button>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems.map((item) => <NavLink key={item.id} item={item} />)}
        </nav>
      </div>
      <div className="mt-auto p-2 lg:p-4">
        <nav className="grid items-start text-sm font-medium">
          {bottomNavItems.map((item) => <NavLink key={item.id} item={item} />)}
          {loading ? null : user ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className="w-full justify-center sm:justify-start" size="icon" onClick={signOut}>
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only sm:not-sr-only sm:ml-4">Logout</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden sm:block">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className="w-full justify-center sm:justify-start" size="icon" onClick={signInWithGoogle}>
                  <LogIn className="h-5 w-5" />
                  <span className="sr-only sm:not-sr-only sm:ml-4">Login</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden sm:block">Login</TooltipContent>
            </Tooltip>
          )}
        </nav>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} onClick={() => setIsOpen(false)} />
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-3/4 border-r bg-background transition-transform duration-300 ease-in-out sm:w-72",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <SidebarContent />
        </aside>
      </>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;