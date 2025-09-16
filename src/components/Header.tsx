"use client";

import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

const pageTitles: { [key: string]: string } = {
  "/dashboard": "Dashboard",
  "/strategies": "Strategies",
  "/alerts": "Alerts",
  "/journal": "Trade Journal",
  "/settings": "Settings",
};

const Header = ({ onMenuClick }: HeaderProps) => {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Dashboard";

  return (
    <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Button 
        size="icon" 
        variant="outline" 
        className="sm:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <h1 className="font-semibold text-lg">{title}</h1>
    </header>
  );
};

export default Header;