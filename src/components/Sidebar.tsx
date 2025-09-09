"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  BarChart3, 
  Bell, 
  BookOpen, 
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  LogIn, // Import LogIn icon
  LogOut, // Import LogOut icon
  UserCircle // Import UserCircle icon
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth hook

const Sidebar = ({ activePage, setActivePage }: { 
  activePage: string; 
  setActivePage: (page: string) => void 
}) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, signInWithGoogle, signOut } = useAuth(); // Use the auth hook

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "strategies", label: "Strategies", icon: BarChart3, path: "/strategies" },
    { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts" },
    { id: "journal", label: "Trade Journal", icon: BookOpen, path: "/journal" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">TradeRadar</h1>
            <p className="text-sm text-muted-foreground">Trading Strategy Monitor</p>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link to={item.path} onClick={() => {
                      setActivePage(item.id);
                      setIsOpen(false);
                    }}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-10 mb-1",
                          activePage === item.id && "bg-muted"
                        )}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Button>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          <div className="p-4 border-t space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading user...</div>
            ) : user ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{user.email || "User"}</span>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={signOut}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={signInWithGoogle}
              >
                <LogIn className="mr-3 h-5 w-5" />
                Login with Google
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="mr-3 h-5 w-5" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="mr-3 h-5 w-5" />
                  Dark Mode
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;